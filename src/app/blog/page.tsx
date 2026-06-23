import { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { BlogList } from "@/features/blog/components/blog-list"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Blog",
  description: "Read the latest news, announcements, and stories from the Tanzanian diaspora community in the United States.",
  keywords: ["TSA Blog", "Tanzanian Diaspora News", "Tanzania Sharing Association News", "Tanzanian American Stories"],
}

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16 md:pt-20">
        <BlogList />
      </main>
      <Footer />
    </>
  )
}
