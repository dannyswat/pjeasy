package htmlsanitizer

import (
	"strings"
	"testing"
)

func TestSanitizeStripsScriptsAndJavascriptURLs(t *testing.T) {
	input := `<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>`
	output := Sanitize(input)

	if strings.Contains(strings.ToLower(output), "<script") {
		t.Fatalf("expected script tag to be removed, got %q", output)
	}
	if strings.Contains(strings.ToLower(output), "javascript:") {
		t.Fatalf("expected javascript URLs to be removed, got %q", output)
	}
	if !strings.Contains(output, `<p>Hello</p>`) {
		t.Fatalf("expected safe paragraph to remain, got %q", output)
	}
}

func TestSanitizeAllowsEditorMarkup(t *testing.T) {
	input := `<h2 style="text-align:center">Title</h2><p><span style="color:#3b82f6;font-size:24px">Body</span></p><pre><code class="language-typescript">const x = 1;</code></pre><img src="/uploads/images/example.png" alt="example" width="320" height="180" style="max-width:100%">`
	output := Sanitize(input)

	checks := []string{
		`<h2 style="text-align: center">Title</h2>`,
		`color: #3b82f6`,
		`font-size: 24px`,
		`class="language-typescript"`,
		`src="/uploads/images/example.png"`,
		`style="max-width: 100%"`,
	}

	for _, check := range checks {
		if !strings.Contains(output, check) {
			t.Fatalf("expected sanitized output to contain %q, got %q", check, output)
		}
	}
}

func TestHasMeaningfulContent(t *testing.T) {
	if HasMeaningfulContent(`<p>   </p>`) {
		t.Fatal("expected empty paragraph to be treated as empty")
	}
	if !HasMeaningfulContent(`<img src="/uploads/images/example.png" alt="x">`) {
		t.Fatal("expected image-only content to be treated as meaningful")
	}
	if !HasMeaningfulContent(`<p>Hello</p>`) {
		t.Fatal("expected text content to be treated as meaningful")
	}
}
