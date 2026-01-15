package sequences

import (
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SequenceRepository struct {
	db *gorm.DB
}

func NewSequenceRepository(db *gorm.DB) *SequenceRepository {
	return &SequenceRepository{db: db}
}

// CreateSequence creates a new sequence configuration
func (r *SequenceRepository) CreateSequence(sequence *Sequence) error {
	now := time.Now()
	sequence.CreatedAt = now
	sequence.UpdatedAt = now
	return r.db.Create(sequence).Error
}

// GetSequenceByID finds a sequence by ID
func (r *SequenceRepository) GetSequenceByID(id int) (*Sequence, error) {
	var sequence Sequence
	err := r.db.First(&sequence, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &sequence, err
}

// GetSequenceByItemType finds a sequence configuration by project and item type
func (r *SequenceRepository) GetSequenceByItemType(projectID int, itemType string) (*Sequence, error) {
	var sequence Sequence
	err := r.db.Where("project_id = ? AND item_type = ?", projectID, itemType).First(&sequence).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &sequence, err
}

// UpdateSequence updates a sequence configuration
func (r *SequenceRepository) UpdateSequence(sequence *Sequence) error {
	sequence.UpdatedAt = time.Now()
	return r.db.Save(sequence).Error
}

// DeleteSequence deletes a sequence configuration
func (r *SequenceRepository) DeleteSequence(id int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Delete the sequence configuration
		if err := tx.Delete(&Sequence{}, id).Error; err != nil {
			return err
		}
		return nil
	})
}

// ListSequences returns all sequence configurations
func (r *SequenceRepository) ListSequences() ([]Sequence, error) {
	var sequences []Sequence
	err := r.db.Order("project_id ASC, item_type ASC").Find(&sequences).Error
	return sequences, err
}

// ListSequencesByProject returns sequence configurations for a specific project
func (r *SequenceRepository) ListSequencesByProject(projectID int) ([]Sequence, error) {
	var sequences []Sequence
	err := r.db.Where("project_id = ?", projectID).Order("item_type ASC").Find(&sequences).Error
	return sequences, err
}

// GetNextNumber generates the next sequential number for an item type in a project
// This method should be called within a transaction to ensure atomicity
func (r *SequenceRepository) GetNextNumber(tx *gorm.DB, projectID int, itemType string) (string, error) {
	// Get the sequence configuration
	var sequence Sequence
	if err := tx.Where("project_id = ? AND item_type = ?", projectID, itemType).First(&sequence).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", fmt.Errorf("sequence configuration not found for project %d and item type: %s", projectID, itemType)
		}
		return "", err
	}

	// Get or create the sequence number record with row locking
	var seqNumber SequenceNumber
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("project_id = ? AND item_type = ?", projectID, itemType).
		First(&seqNumber).Error

	if err == gorm.ErrRecordNotFound {
		// Create new sequence number starting at 1
		seqNumber = SequenceNumber{
			ProjectID:  projectID,
			ItemType:   itemType,
			NextNumber: 1,
			UpdatedAt:  time.Now(),
		}
		if err := tx.Create(&seqNumber).Error; err != nil {
			return "", err
		}
	} else if err != nil {
		return "", err
	}

	// Generate the formatted number
	currentNumber := seqNumber.NextNumber
	formattedNumber := r.formatSequenceNumber(&sequence, currentNumber)

	// Increment the next number
	seqNumber.NextNumber++
	seqNumber.UpdatedAt = time.Now()
	if err := tx.Save(&seqNumber).Error; err != nil {
		return "", err
	}

	return formattedNumber, nil
}

// formatSequenceNumber formats the sequence number with prefix and padding
func (r *SequenceRepository) formatSequenceNumber(sequence *Sequence, number int) string {
	now := time.Now()
	prefix := sequence.Prefix

	// Replace year placeholders
	prefix = strings.ReplaceAll(prefix, "{yyyy}", fmt.Sprintf("%04d", now.Year()))
	prefix = strings.ReplaceAll(prefix, "{yy}", fmt.Sprintf("%02d", now.Year()%100))

	// Replace month placeholder
	prefix = strings.ReplaceAll(prefix, "{mm}", fmt.Sprintf("%02d", now.Month()))

	// Format the number with padding
	paddedNumber := fmt.Sprintf("%0*d", sequence.PaddedZeroLength, number)

	return prefix + paddedNumber
}

// ResetSequenceNumber resets the sequence number for an item type in a project
// This should be called within a transaction
func (r *SequenceRepository) ResetSequenceNumber(tx *gorm.DB, projectID int, itemType string, resetTo int) error {
	if resetTo < 1 {
		resetTo = 1
	}

	var seqNumber SequenceNumber
	err := tx.Where("project_id = ? AND item_type = ?", projectID, itemType).First(&seqNumber).Error

	if err == gorm.ErrRecordNotFound {
		// Create new sequence number
		seqNumber = SequenceNumber{
			ProjectID:  projectID,
			ItemType:   itemType,
			NextNumber: resetTo,
			UpdatedAt:  time.Now(),
		}
		return tx.Create(&seqNumber).Error
	} else if err != nil {
		return err
	}

	// Update existing sequence number
	seqNumber.NextNumber = resetTo
	seqNumber.UpdatedAt = time.Now()
	return tx.Save(&seqNumber).Error
}

// GetCurrentSequenceNumber returns the current sequence number without incrementing
func (r *SequenceRepository) GetCurrentSequenceNumber(projectID int, itemType string) (*SequenceNumber, error) {
	var seqNumber SequenceNumber
	err := r.db.Where("project_id = ? AND item_type = ?", projectID, itemType).First(&seqNumber).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &seqNumber, err
}

// PreviewNextNumber previews what the next number would be without actually incrementing
func (r *SequenceRepository) PreviewNextNumber(projectID int, itemType string) (string, error) {
	// Get the sequence configuration
	var sequence Sequence
	if err := r.db.Where("project_id = ? AND item_type = ?", projectID, itemType).First(&sequence).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", fmt.Errorf("sequence configuration not found for project %d and item type: %s", projectID, itemType)
		}
		return "", err
	}

	// Get the current sequence number
	var seqNumber SequenceNumber
	err := r.db.Where("project_id = ? AND item_type = ?", projectID, itemType).First(&seqNumber).Error

	nextNumber := 1
	if err == nil {
		nextNumber = seqNumber.NextNumber
	} else if err != gorm.ErrRecordNotFound {
		return "", err
	}

	// Generate the formatted number without incrementing
	return r.formatSequenceNumber(&sequence, nextNumber), nil
}

// CreateSequenceIfNotExists creates a sequence configuration if it doesn't already exist
func (r *SequenceRepository) CreateSequenceIfNotExists(projectID int, itemType string, prefix string, paddedZeroLength int) error {
	// Check if sequence already exists
	existing, err := r.GetSequenceByItemType(projectID, itemType)
	if err != nil {
		return err
	}
	if existing != nil {
		// Already exists, skip
		return nil
	}

	// Create new sequence
	now := time.Now()
	sequence := &Sequence{
		ProjectID:        projectID,
		ItemType:         itemType,
		Prefix:           prefix,
		PaddedZeroLength: paddedZeroLength,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	return r.db.Create(sequence).Error
}
