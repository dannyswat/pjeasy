package workflow

import (
	"context"
	"testing"

	"github.com/dannyswat/pjeasy/internal/features"
	"github.com/dannyswat/pjeasy/internal/ideas"
	"github.com/dannyswat/pjeasy/internal/tasks"
)

type mockIdeaGetter struct {
	idea *ideas.Idea
}

func (m *mockIdeaGetter) GetByID(id int) (*ideas.Idea, error) {
	return m.idea, nil
}

type mockFeatureRepository struct {
	features []features.Feature
}

func (m *mockFeatureRepository) GetByItemReference(projectID int, itemType string, itemID int, offset, limit int) ([]features.Feature, int64, error) {
	return m.features, int64(len(m.features)), nil
}

type mockTaskRepository struct {
	tasks []tasks.Task
}

func (m *mockTaskRepository) GetByItemReference(projectID int, itemType string, itemID int, offset, limit int) ([]tasks.Task, int64, error) {
	return m.tasks, int64(len(m.tasks)), nil
}

type mockIdeaUpdater struct {
	updatedIdeas map[int]string
}

func (m *mockIdeaUpdater) UpdateIdeaStatusByWorkflow(ideaID int, status string) error {
	m.updatedIdeas[ideaID] = status
	return nil
}

func TestCascadeCompletionChecker_ShouldCascadeCompleteIdea(t *testing.T) {
	checker := NewCascadeCompletionChecker(
		nil,
		nil,
		&mockIdeaGetter{idea: &ideas.Idea{ID: 7, Status: ideas.IdeaStatusOpen, CascadeCompletion: true}},
		&mockFeatureRepository{features: []features.Feature{{ID: 11, Status: features.FeatureStatusCompleted}}},
		&mockTaskRepository{tasks: []tasks.Task{{ID: 13, Status: tasks.TaskStatusCompleted}}},
	)

	shouldCascade, err := checker.ShouldCascadeCompleteParent(1, "ideas", 7)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !shouldCascade {
		t.Fatal("expected idea to cascade close when all related work is completed")
	}
}

func TestCascadeCompletionChecker_DoesNotCascadeIdeaWithIncompleteFeature(t *testing.T) {
	checker := NewCascadeCompletionChecker(
		nil,
		nil,
		&mockIdeaGetter{idea: &ideas.Idea{ID: 7, Status: ideas.IdeaStatusOpen, CascadeCompletion: true}},
		&mockFeatureRepository{features: []features.Feature{{ID: 11, Status: features.FeatureStatusOpen}}},
		&mockTaskRepository{tasks: []tasks.Task{{ID: 13, Status: tasks.TaskStatusCompleted}}},
	)

	shouldCascade, err := checker.ShouldCascadeCompleteParent(1, "ideas", 7)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if shouldCascade {
		t.Fatal("expected idea cascade to stop when a related feature is still open")
	}
}

func TestCompleteIdeaAction_ExecutesForIdeaParent(t *testing.T) {
	updater := &mockIdeaUpdater{updatedIdeas: make(map[int]string)}
	action := NewCompleteIdeaAction(updater, ideas.IdeaStatusClosed)
	ideaID := 21

	event := Event{
		Data: map[string]interface{}{
			"itemType": "ideas",
			"itemId":   &ideaID,
		},
	}

	if err := action.Execute(context.Background(), event); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if updater.updatedIdeas[ideaID] != ideas.IdeaStatusClosed {
		t.Fatalf("expected idea %d to be closed, got %q", ideaID, updater.updatedIdeas[ideaID])
	}
}
