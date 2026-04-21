pub mod fs;

use dav_server::{DavHandler, memls::MemLs};
use std::net::SocketAddr;
use std::sync::Arc;
use anyhow::{Result, anyhow};
use axum::{Router, response::IntoResponse, body::Body as AxumBody};
use crate::cache::MetadataCache;
use crate::cluster::ClusterOrchestrator;
use crate::session_manager::SessionManager;
use self::fs::ClusterFs;
use futures_util::StreamExt;

pub struct WebDavBridge {
    handler: DavHandler,
}

impl WebDavBridge {
    pub fn new(
        cache: Arc<MetadataCache>,
        orchestrator: Arc<ClusterOrchestrator>,
        session_manager: Arc<SessionManager>,
        tmp_dir: std::path::PathBuf,
    ) -> Self {
        let ls = MemLs::new();
        let fs = ClusterFs {
            cache,
            orchestrator,
            session_manager,
            tmp_dir,
        };
        
        let handler = DavHandler::builder()
            .filesystem(Box::new(fs))
            .locksystem(ls)
            .build_handler();

        Self { handler }
    }

    /// Starts the WebDAV server on the specified port using Axum.
    pub async fn start(this: Arc<Self>, port: u16) -> Result<()> {
        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        let bridge = this;
        
        let app = Router::new()
            .fallback(move |req: axum::extract::Request| {
                let bridge = Arc::clone(&bridge);
                async move {
                    bridge.handle_request(req).await
                }
            });

        println!("Folded WebDAV Bridge starting at http://{}", addr);
        
        let listener = tokio::net::TcpListener::bind(addr).await
            .map_err(|e| anyhow::anyhow!("Failed to bind WebDAV port {}: {}", port, e))?;
            
        let server = axum::serve(listener, app.into_make_service());
        server.await.map_err(|e| anyhow::anyhow!("WebDAV server error: {}", e))?;
        
        Ok(())
    }

    async fn handle_request(&self, req: axum::extract::Request) -> impl IntoResponse {
        let (parts, body) = req.into_parts();
        
        // 1. Convert axum (http 1.x) Request parts to http_02 Request parts
        let mut builder = http_02::Request::builder()
            .method(parts.method.as_str())
            .uri(parts.uri.to_string());
        
        if let Some(headers) = builder.headers_mut() {
            for (name, value) in parts.headers.iter() {
                if let Ok(name) = http_02::header::HeaderName::from_bytes(name.as_str().as_bytes()) {
                    headers.insert(name, http_02::HeaderValue::from_bytes(value.as_bytes()).unwrap());
                }
            }
        }

        // 2. Convert axum Body to a stream that dav-server understands
        let body_stream = body.into_data_stream().map(|res| {
            res.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
        });
        
        let dav_req = builder.body(body_stream).unwrap();
        
        // 3. Handle with dav-server
        let dav_res = self.handler.handle_stream(dav_req).await;
        
        // 4. Convert http_02 Response back to axum Response
        let (res_parts, res_body) = dav_res.into_parts();
        let mut axum_res_builder = axum::http::Response::builder()
            .status(res_parts.status.as_u16());
            
        for (name, value) in res_parts.headers.iter() {
            axum_res_builder = axum_res_builder.header(name.as_str(), value.as_bytes());
        }

        // 5. Convert dav_server Body to axum Body
        let res_stream = res_body.map(|res| {
            res.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
        });
        
        axum_res_builder.body(AxumBody::from_stream(res_stream)).unwrap()
    }
}
