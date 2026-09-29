import logging
import ipaddress
import socket
import httpx
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger("seomind.crawler")

class CrawlerService:
    """
    Website crawler & HTML parser engine with SSRF security boundaries.
    """

    @staticmethod
    def is_safe_url(url: str) -> bool:
        """
        SSRF Protection: Ensure target URL is valid HTTP/HTTPS and does not target internal or private networks.
        """
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                return False
            
            hostname = parsed.hostname
            if not hostname:
                return False

            # Block loopback, common cloud metadata endpoints
            blocked_hosts = {
                "localhost", "127.0.0.1", "0.0.0.0", "::1",
                "169.254.169.254", "metadata.google.internal", "instance-data"
            }
            if hostname.lower() in blocked_hosts or hostname.lower().endswith(".internal") or hostname.lower().endswith(".local"):
                return False

            # Resolve IP address to prevent local and private network scanning
            try:
                # getaddrinfo handles both IPv4 and IPv6 addresses
                addr_info = socket.getaddrinfo(hostname, None)
                for item in addr_info:
                    sockaddr = item[4]
                    ip_str = sockaddr[0]
                    ip = ipaddress.ip_address(ip_str)
                    if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local or ip.is_multicast:
                        return False
            except (socket.gaierror, ValueError):
                # If DNS resolution fails, allow only if hostname syntax is a valid public domain
                if not "." in hostname:
                    return False

            return True
        except Exception as e:
            logger.warning(f"URL validation error for {url}: {e}")
            return False

    async def fetch_page(self, url: str) -> Optional[Dict[str, Any]]:
        """Fetch and parse a single page URL safely."""
        if not self.is_safe_url(url):
            logger.warning(f"Crawling blocked for unsafe or private URL: {url}")
            return {
                "url": url,
                "status_code": 403,
                "error": "URL blocked for security (SSRF protection / private network address)"
            }

        headers = {
            "User-Agent": "SEO-Mind-Agent/1.0 (+https://seomind.ai/bot)"
        }

        try:
            curr_url = url
            max_redirects = 5
            redirect_count = 0
            
            async with httpx.AsyncClient(timeout=settings.CRAWL_TIMEOUT_SECONDS, follow_redirects=False) as client:
                while redirect_count < max_redirects:
                    if not self.is_safe_url(curr_url):
                        return {
                            "url": curr_url,
                            "status_code": 403,
                            "error": "Redirect target blocked for security (SSRF protection)"
                        }
                    resp = await client.get(curr_url, headers=headers)
                    if resp.is_redirect and "location" in resp.headers:
                        curr_url = urljoin(curr_url, resp.headers["location"])
                        redirect_count += 1
                    else:
                        break

                status_code = resp.status_code
                content_type = resp.headers.get("content-type", "")
                
                if "text/html" not in content_type.lower():
                    return {
                        "url": curr_url,
                        "status_code": status_code,
                        "error": f"Non-HTML content type: {content_type}"
                    }

                html = resp.text
                soup = BeautifulSoup(html, "html.parser")

                # 1. Title tag
                title_tag = soup.find("title")
                title = title_tag.get_text(strip=True) if title_tag else None

                # 2. Meta description
                meta_desc = soup.find("meta", attrs={"name": lambda x: x and x.lower() == "description"})
                meta_description = meta_desc.get("content", "").strip() if meta_desc else None

                # 3. H1 & Headings
                h1_tags = [h.get_text(strip=True) for h in soup.find_all("h1")]
                h2_tags = [h.get_text(strip=True) for h in soup.find_all("h2")]
                h3_tags = [h.get_text(strip=True) for h in soup.find_all("h3")]
                primary_h1 = h1_tags[0] if h1_tags else None

                # 4. Canonical
                canonical_tag = soup.find("link", attrs={"rel": lambda x: x and "canonical" in x.lower()})
                canonical = canonical_tag.get("href") if canonical_tag else None

                # 5. Robots directives
                robots_meta = soup.find("meta", attrs={"name": lambda x: x and x.lower() == "robots"})
                robots_content = robots_meta.get("content", "").strip() if robots_meta else None

                # 6. Image alt attributes
                images = soup.find_all("img")
                missing_alt_images = [img.get("src", "") for img in images if not img.get("alt")]

                # 7. Internal & External links
                internal_links = []
                external_links = []
                parsed_base = urlparse(url)
                
                for a in soup.find_all("a", href=True):
                    href = a["href"].strip()
                    full_link = urljoin(url, href)
                    parsed_link = urlparse(full_link)
                    if parsed_link.hostname == parsed_base.hostname:
                        internal_links.append(full_link)
                    else:
                        external_links.append(full_link)

                # 8. Basic Content Length
                text_content = soup.get_text(separator=" ", strip=True)
                word_count = len(text_content.split())

                return {
                    "url": url,
                    "status_code": status_code,
                    "title": title,
                    "meta_description": meta_description,
                    "primary_h1": primary_h1,
                    "h1_count": len(h1_tags),
                    "h2_count": len(h2_tags),
                    "h3_count": len(h3_tags),
                    "canonical": canonical,
                    "robots_meta": robots_content,
                    "total_images": len(images),
                    "missing_alt_count": len(missing_alt_images),
                    "internal_links_count": len(internal_links),
                    "external_links_count": len(external_links),
                    "word_count": word_count,
                    "is_https": url.lower().startswith("https://")
                }

        except Exception as e:
            logger.error(f"Error crawling page {url}: {e}")
            return {
                "url": url,
                "status_code": 500,
                "error": f"Crawl error: {str(e)}"
            }

    async def check_sitemap_and_robots(self, domain_url: str) -> Dict[str, Any]:
        """Verify presence of robots.txt and sitemap.xml."""
        if not self.is_safe_url(domain_url):
            return {"has_robots": False, "has_sitemap": False}

        parsed = urlparse(domain_url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        
        has_robots = False
        has_sitemap = False

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r_robots = await client.get(f"{base}/robots.txt")
                if r_robots.status_code == 200 and "user-agent" in r_robots.text.lower():
                    has_robots = True

                r_sitemap = await client.get(f"{base}/sitemap.xml")
                if r_sitemap.status_code == 200 and ("xml" in r_sitemap.text.lower() or "urlset" in r_sitemap.text.lower()):
                    has_sitemap = True
        except Exception:
            pass

        return {
            "has_robots": has_robots,
            "has_sitemap": has_sitemap
        }

crawler_service = CrawlerService()
