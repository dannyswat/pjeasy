package sequences

type SequenceService struct {
	sequenceRepo *SequenceRepository
}

func NewSequenceService(sequenceRepo *SequenceRepository) *SequenceService {
	return &SequenceService{
		sequenceRepo: sequenceRepo,
	}
}

// SequenceDefinition defines the configuration for a sequence
type SequenceDefinition struct {
	ItemType         string
	Prefix           string
	PaddedZeroLength int
}

// GetDefaultSequenceDefinitions returns the default sequence definitions for a project
func (s *SequenceService) GetDefaultSequenceDefinitions() []SequenceDefinition {
	return []SequenceDefinition{
		{ItemType: "ideas", Prefix: "IDEA", PaddedZeroLength: 4},
		// Add more default sequences here as needed:
		// {ItemType: "tasks", Prefix: "TASK", PaddedZeroLength: 4},
		// {ItemType: "bugs", Prefix: "BUG-{yy}-", PaddedZeroLength: 3},
	}
}

// GenerateProjectSequences generates default sequences for a project
func (s *SequenceService) GenerateProjectSequences(projectID int) error {
	defaultSequences := s.GetDefaultSequenceDefinitions()

	for _, seq := range defaultSequences {
		if err := s.sequenceRepo.CreateSequenceIfNotExists(
			projectID,
			seq.ItemType,
			seq.Prefix,
			seq.PaddedZeroLength,
		); err != nil {
			return err
		}
	}

	return nil
}

// GetSequenceByItemType retrieves a sequence configuration
func (s *SequenceService) GetSequenceByItemType(projectID int, itemType string) (*Sequence, error) {
	return s.sequenceRepo.GetSequenceByItemType(projectID, itemType)
}

// ListSequencesByProject lists all sequences for a project
func (s *SequenceService) ListSequencesByProject(projectID int) ([]Sequence, error) {
	return s.sequenceRepo.ListSequencesByProject(projectID)
}
