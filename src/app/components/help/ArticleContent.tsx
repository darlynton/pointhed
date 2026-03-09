interface ArticleContentProps {
  html: string;
}

export function ArticleContent({ html }: ArticleContentProps) {
  return (
    <div
      className="article-content prose prose-gray max-w-none 
        [&_h3]:font-sora [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-8 [&_h3]:mb-3
        [&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:mb-4
        [&_ul]:text-gray-600 [&_ul]:mb-4 [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:list-disc
        [&_ol]:text-gray-600 [&_ol]:mb-4 [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:list-decimal
        [&_li]:leading-relaxed
        [&_strong]:text-gray-900 [&_strong]:font-medium
        [&_em]:text-gray-500
        [&_a]:text-[#264EFF] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#1a3ed9]
        [&_table]:w-full [&_table]:text-sm [&_table]:text-gray-600 [&_table]:mb-4 [&_table]:border-collapse
        [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2
        [&_tr:first-child_td]:bg-gray-50 [&_tr:first-child_td]:font-medium [&_tr:first-child_td]:text-gray-900"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
