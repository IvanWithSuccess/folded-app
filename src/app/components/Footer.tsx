import React from "react";
import { Link } from "react-router";
import imgLogo from "../../imports/Frame28/8db2f9ecea5ebe90a67ef819abf5dc64a0577460.png";

export default function Footer() {
  return (
    <footer className="bg-[#09090b] border-t border-white/5 py-16 px-6 font-['Montserrat',sans-serif]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Brand Block */}
        <div className="md:col-span-5 space-y-4">
          <Link to="/" className="flex items-center gap-3">
            <img alt="Folded Logo" src={imgLogo} className="w-12 h-12 object-contain" />
            <span className="text-2xl font-black text-white tracking-widest">FOLDED</span>
          </Link>
          <p className="text-sm text-gray-400 font-light max-w-sm leading-relaxed">
            Truly unlimited personal cloud storage, powered by your Telegram. Mount your storage as a virtual network drive and stream media on-the-fly.
          </p>
        </div>

        {/* Links Column 1: Project */}
        <div className="md:col-span-2 space-y-4">
          <h4 className="text-xs uppercase tracking-wider font-bold text-white">Проект</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <Link to="/" className="hover:text-white transition-colors">Главная</Link>
            </li>
            <li>
              <Link to="/how-it-works" className="hover:text-white transition-colors">Как это устроено</Link>
            </li>
            <li>
              <Link to="/download" className="hover:text-white transition-colors">Скачать</Link>
            </li>
            <li>
              <Link to="/updates" className="hover:text-white transition-colors">Обновления</Link>
            </li>
          </ul>
        </div>

        {/* Links Column 2: Resources */}
        <div className="md:col-span-2 space-y-4">
          <h4 className="text-xs uppercase tracking-wider font-bold text-white">Документация</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <Link to="/manual" className="hover:text-white transition-colors">Руководство</Link>
            </li>
            <li>
              <Link to="/manual" className="hover:text-white transition-colors">Проводник файлов</Link>
            </li>
            <li>
              <Link to="/manual" className="hover:text-white transition-colors">Центр аккаунтов</Link>
            </li>
            <li>
              <Link to="/manual" className="hover:text-white transition-colors">Бэкап (Mirroring)</Link>
            </li>
          </ul>
        </div>

        {/* Links Column 3: Community */}
        <div className="md:col-span-3 space-y-4">
          <h4 className="text-xs uppercase tracking-wider font-bold text-white">Сообщество</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <a
                href="https://github.com/IvanWithSuccess/folded-app"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                GitHub репозиторий
              </a>
            </li>
            <li>
              <a
                href="https://github.com/IvanWithSuccess/folded-app/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Сообщить о баге (GitHub Issues)
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
        <span>© {new Date().getFullYear()} Folded Cloud. Все права защищены.</span>
        <span className="font-light">
          Проект разработан с заботой о вашей приватности.
        </span>
      </div>
    </footer>
  );
}
