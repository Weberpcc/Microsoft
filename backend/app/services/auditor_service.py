import logging
from typing import Dict, Any, List
from app.services.crawler_service import crawler_service
from app.services.groq_service import groq_service

logger = logging.getLogger("seomind.auditor")

class AuditorService:
    """
    Deterministic SEO Audit engine applying technical standards and scoring rules.
    """

    async def run_full_audit(self, target_url: str) -> Dict[str, Any]:
        # 1. Fetch main target page data
        page_data = await crawler_service.fetch_page(target_url)
        
        # 2. Fetch sitemap and robots.txt
        robots_sitemap = await crawler_service.check_sitemap_and_robots(target_url)

        issues = []
        critical_count = 0
        warning_count = 0
        info_count = 0
        health_score = 100

        if "error" in page_data:
            issues.append({
                "issue_type": "page_unreachable",
                "severity": "critical",
                "title": "Target Website Page Unreachable",
                "description": page_data["error"],
                "recommendation": "Verify website status, server accessibility, and domain DNS settings.",
                "affected_url": target_url
            })
            return {
                "target_url": target_url,
                "health_score": 10,
                "total_issues": 1,
                "critical_count": 1,
                "warning_count": 0,
                "info_count": 0,
                "issues": issues,
                "summary": "Target website was unreachable during crawl.",
                "page_details": page_data
            }

        # Rule 1: Page Title Missing or Short
        title = page_data.get("title")
        if not title:
            issues.append({
                "issue_type": "title_missing",
                "severity": "critical",
                "title": "Missing HTML Page Title",
                "description": "The page lacks a <title> tag, which is essential for search engines and user click-through rates.",
                "recommendation": "Add a unique, descriptive page title between 50-60 characters.",
                "affected_url": target_url
            })
            critical_count += 1
            health_score -= 15
        elif len(title) < 20 or len(title) > 70:
            issues.append({
                "issue_type": "title_length",
                "severity": "warning",
                "title": f"Suboptimal Title Length ({len(title)} chars)",
                "description": f"Page title is {len(title)} characters. Ideal title length is between 50-60 characters.",
                "recommendation": "Adjust page title length to prevent truncation in search engine result pages (SERPs).",
                "affected_url": target_url
            })
            warning_count += 1
            health_score -= 5

        # Rule 2: Meta Description
        meta_desc = page_data.get("meta_description")
        if not meta_desc:
            issues.append({
                "issue_type": "meta_description_missing",
                "severity": "critical",
                "title": "Missing Meta Description Tag",
                "description": "No meta description tag was found on the page.",
                "recommendation": "Add a compelling meta description (120-160 characters) containing target keywords.",
                "affected_url": target_url
            })
            critical_count += 1
            health_score -= 15
        elif len(meta_desc) < 70 or len(meta_desc) > 170:
            issues.append({
                "issue_type": "meta_description_length",
                "severity": "warning",
                "title": f"Meta Description Length Warning ({len(meta_desc)} chars)",
                "description": f"Meta description is {len(meta_desc)} characters long.",
                "recommendation": "Keep meta descriptions between 120 and 160 characters for optimal SERP snippets.",
                "affected_url": target_url
            })
            warning_count += 1
            health_score -= 5

        # Rule 3: H1 Heading Hierarchy
        h1_count = page_data.get("h1_count", 0)
        if h1_count == 0:
            issues.append({
                "issue_type": "h1_missing",
                "severity": "critical",
                "title": "Missing H1 Heading Tag",
                "description": "No <h1> heading element was detected on the page.",
                "recommendation": "Add exactly one primary <h1> heading containing the main page focus keyword.",
                "affected_url": target_url
            })
            critical_count += 1
            health_score -= 15
        elif h1_count > 1:
            issues.append({
                "issue_type": "h1_multiple",
                "severity": "warning",
                "title": f"Multiple H1 Headings Detected ({h1_count})",
                "description": f"Page contains {h1_count} <h1> headings.",
                "recommendation": "Use only one <h1> tag per page to establish clear topical hierarchy.",
                "affected_url": target_url
            })
            warning_count += 1
            health_score -= 5

        # Rule 4: Image Alt Attributes
        missing_alts = page_data.get("missing_alt_count", 0)
        total_images = page_data.get("total_images", 0)
        if missing_alts > 0:
            issues.append({
                "issue_type": "image_alt_missing",
                "severity": "warning",
                "title": f"{missing_alts} Images Missing Alt Text",
                "description": f"Out of {total_images} images, {missing_alts} lack descriptive alt attributes.",
                "recommendation": "Add descriptive alt attributes to images for SEO and web accessibility compliance.",
                "affected_url": target_url
            })
            warning_count += 1
            health_score -= min(15, missing_alts * 2)

        # Rule 5: Canonical Tag
        if not page_data.get("canonical"):
            issues.append({
                "issue_type": "canonical_missing",
                "severity": "info",
                "title": "Missing Self-Referential Canonical Tag",
                "description": "No canonical tag specified.",
                "recommendation": "Add a rel='canonical' link tag to prevent potential duplicate content issues.",
                "affected_url": target_url
            })
            info_count += 1
            health_score -= 3

        # Rule 6: HTTPS Security
        if not page_data.get("is_https"):
            issues.append({
                "issue_type": "http_insecure",
                "severity": "critical",
                "title": "Insecure HTTP Protocol",
                "description": "The site is served over unencrypted HTTP instead of HTTPS.",
                "recommendation": "Install an SSL certificate and redirect HTTP traffic to HTTPS.",
                "affected_url": target_url
            })
            critical_count += 1
            health_score -= 20

        # Rule 7: Robots.txt & Sitemap
        if not robots_sitemap["has_robots"]:
            issues.append({
                "issue_type": "robots_missing",
                "severity": "warning",
                "title": "Missing or Unreachable robots.txt",
                "description": "No valid robots.txt file was found at domain root.",
                "recommendation": "Create a robots.txt file to guide search engine crawlers.",
                "affected_url": target_url
            })
            warning_count += 1
            health_score -= 5

        if not robots_sitemap["has_sitemap"]:
            issues.append({
                "issue_type": "sitemap_missing",
                "severity": "warning",
                "title": "Missing or Unreachable sitemap.xml",
                "description": "No XML sitemap was detected at domain root.",
                "recommendation": "Generate and submit an XML sitemap to Google Search Console.",
                "affected_url": target_url
            })
            warning_count += 1
            health_score -= 5

        # Rule 8: Low Content Word Count
        word_count = page_data.get("word_count", 0)
        if word_count < 250:
            issues.append({
                "issue_type": "thin_content",
                "severity": "warning",
                "title": f"Thin Page Content ({word_count} words)",
                "description": f"The page has only {word_count} words, which may be classified as thin content.",
                "recommendation": "Expand page content to at least 400+ words with valuable, engaging text.",
                "affected_url": target_url
            })
            warning_count += 1
            health_score -= 10

        # Final health score clamping
        final_health_score = max(0, min(100, health_score))

        # Optional LLM-generated summary
        summary_prompt = f"Summarize the technical SEO health score of {final_health_score}/100 for {target_url} based on these findings: {issues}."
        summary = f"Technical SEO Audit completed for {target_url} with a score of {final_health_score}/100. Identified {critical_count} critical issues and {warning_count} warnings requiring optimization."

        return {
            "target_url": target_url,
            "health_score": final_health_score,
            "total_issues": len(issues),
            "critical_count": critical_count,
            "warning_count": warning_count,
            "info_count": info_count,
            "issues": issues,
            "summary": summary,
            "page_details": page_data,
            "robots_sitemap": robots_sitemap
        }

auditor_service = AuditorService()
