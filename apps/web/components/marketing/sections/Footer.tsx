import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="py-12 border-t border-neutral-900 bg-neutral-950 text-neutral-400">
      <div className="container px-4 mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <div className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-md" />
            Collabverse
          </div>
          <p className="text-sm text-neutral-500">
            Платформа для гибридных команд людей и AI.
          </p>
        </div>
        <div>
          <h4 className="text-white font-medium mb-4 text-sm">Продукт</h4>
          <ul className="space-y-2 text-sm text-neutral-500">
            <li><Link href="#" className="hover:text-white transition-colors">AI Agents</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">Marketplace</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">Project Management</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-4 text-sm">Компания</h4>
          <ul className="space-y-2 text-sm text-neutral-500">
            <li><Link href="#" className="hover:text-white transition-colors">О нас</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">Блог</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">Карьера</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-4 text-sm">Ресурсы</h4>
          <ul className="space-y-2 text-sm text-neutral-500">
            <li><Link href="#" className="hover:text-white transition-colors">Документация</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">Сообщество</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">Поддержка</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
