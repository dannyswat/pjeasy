package wiki_pages

import (
	"sync"
	"testing"

	"gorm.io/gorm/schema"
)

func TestWikiPageSlugIndexIncludesProjectID(t *testing.T) {
	parsedSchema, err := schema.Parse(&WikiPage{}, &sync.Map{}, schema.NamingStrategy{})
	if err != nil {
		t.Fatalf("parse wiki page schema: %v", err)
	}

	index := parsedSchema.LookIndex("idx_project_wiki_slug")
	if index == nil {
		t.Fatal("idx_project_wiki_slug not found")
	}

	fields := map[string]bool{}
	for _, field := range index.Fields {
		fields[field.Field.DBName] = true
	}

	if len(fields) != 2 || !fields["project_id"] || !fields["slug"] {
		t.Fatalf("idx_project_wiki_slug fields = %#v", fields)
	}
}