package repositories

type Repository[T any] interface {
	GetByID(id int) (*T, error)
	Create(entity *T) error
	Update(entity *T) error
	Delete(id int) error
}
