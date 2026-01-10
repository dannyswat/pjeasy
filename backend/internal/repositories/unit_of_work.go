package repositories

import (
	"gorm.io/gorm"
)

type UnitOfWorkFactory struct {
	db *gorm.DB
}

func NewUnitOfWorkFactory(db *gorm.DB) *UnitOfWorkFactory {
	return &UnitOfWorkFactory{
		db: db,
	}
}

func (f *UnitOfWorkFactory) NewUnitOfWork() *UnitOfWork {
	return &UnitOfWork{
		db: f.db,
	}
}

type UnitOfWork struct {
	db *gorm.DB
	tx *gorm.DB
}

func NewUnitOfWork(db *gorm.DB) *UnitOfWork {
	return &UnitOfWork{
		db: db,
	}
}

func (uow *UnitOfWork) GetDB() *gorm.DB {
	if uow.tx != nil {
		return uow.tx
	}
	return uow.db
}

func (uow *UnitOfWork) GetOriginalDB() *gorm.DB {
	return uow.db
}

func (uow *UnitOfWork) BeginTransaction() error {
	if uow.tx != nil {
		return nil // Already in a transaction
	}
	tx := uow.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	uow.tx = tx
	return nil
}

func (uow *UnitOfWork) CommitTransaction() error {
	if uow.tx == nil {
		return nil
	}
	err := uow.tx.Commit().Error
	if err == nil {
		uow.tx = nil
	}
	return err
}

func (uow *UnitOfWork) RollbackTransaction() error {
	if uow.tx == nil {
		return nil
	}
	err := uow.tx.Rollback().Error
	uow.tx = nil
	return err
}

func (uow *UnitOfWork) RollbackTransactionIfError() {
	if r := recover(); r != nil {
		uow.RollbackTransaction()
	}
	if uow.tx != nil {
		uow.RollbackTransaction()
	}
}
