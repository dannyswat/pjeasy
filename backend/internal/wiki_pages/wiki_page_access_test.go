package wiki_pages

import "testing"

func TestCanReadWikiPageStatus(t *testing.T) {
	tests := []struct {
		name            string
		status          string
		isLimitedReader bool
		expected        bool
	}{
		{name: "writer can read draft", status: WikiPageStatusDraft, isLimitedReader: false, expected: true},
		{name: "limited user can read published", status: WikiPageStatusPublished, isLimitedReader: true, expected: true},
		{name: "limited user can read archived", status: WikiPageStatusArchived, isLimitedReader: true, expected: true},
		{name: "limited user cannot read draft", status: WikiPageStatusDraft, isLimitedReader: true, expected: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if result := canReadWikiPageStatus(tt.status, tt.isLimitedReader); result != tt.expected {
				t.Fatalf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestNormalizeWikiListStatus(t *testing.T) {
	tests := []struct {
		name            string
		status          string
		isLimitedReader bool
		expectedStatus  string
		expectedAllowed bool
	}{
		{name: "writer keeps empty status", status: "", isLimitedReader: false, expectedStatus: "", expectedAllowed: true},
		{name: "writer keeps requested status", status: WikiPageStatusArchived, isLimitedReader: false, expectedStatus: WikiPageStatusArchived, expectedAllowed: true},
		{name: "limited user empty becomes published", status: "", isLimitedReader: true, expectedStatus: WikiPageStatusPublished, expectedAllowed: true},
		{name: "limited user published stays published", status: WikiPageStatusPublished, isLimitedReader: true, expectedStatus: WikiPageStatusPublished, expectedAllowed: true},
		{name: "limited user archived list denied", status: WikiPageStatusArchived, isLimitedReader: true, expectedStatus: "", expectedAllowed: false},
		{name: "limited user draft list denied", status: WikiPageStatusDraft, isLimitedReader: true, expectedStatus: "", expectedAllowed: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, allowed := normalizeWikiListStatus(tt.status, tt.isLimitedReader)
			if status != tt.expectedStatus {
				t.Fatalf("expected status %q, got %q", tt.expectedStatus, status)
			}
			if allowed != tt.expectedAllowed {
				t.Fatalf("expected allowed %v, got %v", tt.expectedAllowed, allowed)
			}
		})
	}
}
