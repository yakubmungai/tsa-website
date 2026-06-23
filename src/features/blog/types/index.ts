import { Language } from "@/lib/translations";

export interface ContentBlock {
  type: 'paragraph' | 'heading' | 'quote' | 'list' | 'image' | 'gallery';
  value: string | string[]; // Can be a string for paragraphs/headings/quotes/images, or string[] for list items/gallery
}

export interface BlogPost {
  slug: string;
  title: Record<Language, string>;
  excerpt: Record<Language, string>;
  content: Record<Language, ContentBlock[]>;
  publishedAt: string;
  author: string;
  readTime: Record<Language, string>;
  category: Record<Language, string>;
  coverImage?: string;
}
