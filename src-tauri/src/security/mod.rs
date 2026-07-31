pub mod panic_switch;
pub mod secure_wipe;

pub use panic_switch::{is_panic_mode, reset_panic_mode, set_panic_cache_dir, trigger_panic};
pub use secure_wipe::{secure_delete_file, wipe_directory};
