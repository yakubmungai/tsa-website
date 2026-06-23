import { notFound } from "next/navigation"
import { blogPosts } from "@/features/blog/utils/posts"
import { Navbar } from "@/components/navbar"
import { BlogDetail } from "@/features/blog/components/blog-detail"
import { Footer } from "@/components/footer"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const post = blogPosts.find((p) => p.slug === slug)
  if (!post) {
    return {
      title: "Post Not Found",
    }
  }

  return {
    title: post.title.en,
    description: post.excerpt.en,
    openGraph: {
      title: post.title.en,
      description: post.excerpt.en,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post) {
    notFound()
  }

  return (
    <>
      <Navbar />
      <main>
        <BlogDetail post={post} />
      </main>
      <Footer />
    </>
  )
}
