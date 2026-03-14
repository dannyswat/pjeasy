package htmlsanitizer

import (
	"regexp"
	"strings"
	"sync"

	"github.com/microcosm-cc/bluemonday"
	"golang.org/x/net/html"
)

var (
	policyOnce sync.Once
	policy     *bluemonday.Policy

	colorPattern      = regexp.MustCompile(`(?i)^(#[0-9a-f]{3,8}|rgb(a)?\([^\n\r]{1,64}\)|hsl(a)?\([^\n\r]{1,64}\)|[a-z]+)$`)
	fontSizePattern   = regexp.MustCompile(`^(?:12|14|16|18|20|24|28|32|36|48)px$`)
	textAlignPattern  = regexp.MustCompile(`^(left|center|right|justify)$`)
	maxWidthPattern   = regexp.MustCompile(`^(?:100%|[1-9][0-9]?%)$`)
	languageClassExpr = regexp.MustCompile(`^language-[a-z0-9#+-]+$`)
)

func sanitizerPolicy() *bluemonday.Policy {
	policyOnce.Do(func() {
		policy = bluemonday.NewPolicy()

		policy.AllowStandardAttributes()
		policy.AllowStandardURLs()
		policy.AllowURLSchemes("mailto")
		policy.AllowRelativeURLs(true)

		policy.AllowElements(
			"p", "br", "span",
			"h1", "h2", "h3",
			"strong", "b", "em", "i", "u", "s", "strike",
			"sub", "sup",
			"blockquote",
			"ul", "ol", "li",
			"table", "thead", "tbody", "tfoot", "tr", "th", "td",
			"pre", "code",
			"img",
			"hr",
		)

		policy.AllowAttrs("href").OnElements("a")
		policy.AllowAttrs("target").Matching(regexp.MustCompile(`^_(blank|self)$`)).OnElements("a")
		policy.AllowAttrs("rel").Matching(regexp.MustCompile(`(?i)^(?:noopener|noreferrer|nofollow)(?:\s+(?:noopener|noreferrer|nofollow))*$`)).OnElements("a")
		policy.AllowElements("a")

		policy.AllowAttrs("src").OnElements("img")
		policy.AllowAttrs("alt").OnElements("img")
		policy.AllowAttrs("width").Matching(regexp.MustCompile(`^[1-9][0-9]{0,4}$`)).OnElements("img")
		policy.AllowAttrs("height").Matching(regexp.MustCompile(`^[1-9][0-9]{0,4}$`)).OnElements("img")

		policy.AllowAttrs("colspan").Matching(regexp.MustCompile(`^[1-9][0-9]*$`)).OnElements("td", "th")
		policy.AllowAttrs("rowspan").Matching(regexp.MustCompile(`^[1-9][0-9]*$`)).OnElements("td", "th")

		policy.AllowAttrs("class").Matching(languageClassExpr).OnElements("code", "pre")

		policy.AllowStyles("color").Matching(colorPattern).Globally()
		policy.AllowStyles("font-size").Matching(fontSizePattern).Globally()
		policy.AllowStyles("text-align").Matching(textAlignPattern).Globally()
		policy.AllowStyles("max-width").Matching(maxWidthPattern).OnElements("img")
	})

	return policy
}

func Sanitize(value string) string {
	if strings.TrimSpace(value) == "" {
		return ""
	}

	return sanitizerPolicy().Sanitize(value)
}

func HasMeaningfulContent(value string) bool {
	sanitized := strings.TrimSpace(Sanitize(value))
	if sanitized == "" {
		return false
	}

	doc, err := html.Parse(strings.NewReader(sanitized))
	if err != nil {
		return false
	}

	return hasMeaningfulNode(doc)
}

func hasMeaningfulNode(node *html.Node) bool {
	if node == nil {
		return false
	}

	if node.Type == html.TextNode && strings.TrimSpace(strings.ReplaceAll(node.Data, "\u00a0", " ")) != "" {
		return true
	}

	if node.Type == html.ElementNode {
		switch node.Data {
		case "img", "table", "pre", "code", "blockquote", "ul", "ol", "hr":
			return true
		}
	}

	for child := node.FirstChild; child != nil; child = child.NextSibling {
		if hasMeaningfulNode(child) {
			return true
		}
	}

	return false
}
