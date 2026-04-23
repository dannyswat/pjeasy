package apis

import "testing"

func TestWikiPageSlugIndexNeedsRepair(t *testing.T) {
	tests := []struct {
		name     string
		indexDef string
		want     bool
	}{
		{
			name:     "missing index definition does not trigger repair",
			indexDef: "",
			want:     false,
		},
		{
			name:     "slug only index needs repair",
			indexDef: "CREATE UNIQUE INDEX idx_project_wiki_slug ON public.wiki_pages USING btree (slug)",
			want:     true,
		},
		{
			name:     "project and slug index is accepted",
			indexDef: "CREATE UNIQUE INDEX idx_project_wiki_slug ON public.wiki_pages USING btree (project_id, slug)",
			want:     false,
		},
		{
			name:     "slug then project index is accepted",
			indexDef: "CREATE UNIQUE INDEX idx_project_wiki_slug ON public.wiki_pages USING btree (slug, project_id)",
			want:     false,
		},
		{
			name:     "quoted columns are normalized",
			indexDef: "CREATE UNIQUE INDEX idx_project_wiki_slug ON public.wiki_pages USING btree (\"project_id\", \"slug\")",
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := wikiPageSlugIndexNeedsRepair(tt.indexDef); got != tt.want {
				t.Fatalf("wikiPageSlugIndexNeedsRepair(%q) = %v, want %v", tt.indexDef, got, tt.want)
			}
		})
	}
}