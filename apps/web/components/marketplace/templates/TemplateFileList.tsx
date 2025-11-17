import type { MarketplaceFile } from '@/lib/marketplace/types';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

export default function TemplateFileList({ files }: { files: MarketplaceFile[] }) {
  return (
    <ContentBlock as="section" size="sm" className="space-y-4">
      <ContentBlockTitle>Состав файлов</ContentBlockTitle>
      <div className="overflow-hidden rounded-2xl border border-neutral-800/80">
        <table className="min-w-full divide-y divide-neutral-800 text-sm">
          <thead className="bg-neutral-900/80 text-neutral-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Файл</th>
              <th className="px-4 py-3 text-left font-medium">Размер</th>
              <th className="px-4 py-3 text-left font-medium">Формат</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900/80 bg-neutral-950/50 text-neutral-200">
            {files.map((file) => (
              <tr key={file.name}>
                <td className="px-4 py-3 font-medium text-neutral-100">{file.name}</td>
                <td className="px-4 py-3 text-neutral-400">{file.size}</td>
                <td className="px-4 py-3 text-neutral-400">{file.mime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">
        После покупки файлы доступны для скачивания через защищённые ссылки. Срок действия ссылок — 72 часа, далее
        их можно обновить в разделе «Мои заказы».
      </p>
    </ContentBlock>
  );
}
