package status_changes

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

type StatusList []string

func (s StatusList) Value() (driver.Value, error) {
	if s == nil {
		return "[]", nil
	}

	data, err := json.Marshal([]string(s))
	if err != nil {
		return nil, err
	}

	return string(data), nil
}

func (s *StatusList) Scan(value interface{}) error {
	if value == nil {
		*s = StatusList{}
		return nil
	}

	var raw []byte
	switch typed := value.(type) {
	case []byte:
		raw = typed
	case string:
		raw = []byte(typed)
	default:
		return fmt.Errorf("unsupported StatusList value type %T", value)
	}

	if len(raw) == 0 {
		*s = StatusList{}
		return nil
	}

	var items []string
	if err := json.Unmarshal(raw, &items); err != nil {
		return err
	}

	*s = StatusList(items)
	return nil
}

type StatusFlow struct {
	ID         int        `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID  int        `gorm:"not null;index:idx_status_flow_lookup" json:"projectId"`
	ItemType   string     `gorm:"not null;size:50;index:idx_status_flow_lookup" json:"itemType"`
	FromStatus *string    `gorm:"size:100;index:idx_status_flow_lookup" json:"fromStatus,omitempty"`
	ToStatuses StatusList `gorm:"type:text;not null" json:"toStatuses"`
	Disabled   bool       `gorm:"not null;default:false" json:"disabled"`
	CreatedAt  time.Time  `gorm:"not null" json:"createdAt"`
	UpdatedAt  time.Time  `gorm:"not null" json:"updatedAt"`
}

func (StatusFlow) TableName() string {
	return "status_flows"
}

func (s StatusFlow) Allows(target string) bool {
	for _, allowed := range s.ToStatuses {
		if allowed == target {
			return true
		}
	}

	return false
}
