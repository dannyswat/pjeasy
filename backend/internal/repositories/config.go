package repositories

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

func (dc *DatabaseConfig) GetPostgresConnectionString() string {
	return "host=" + dc.Host +
		" port=" + string(rune(dc.Port)) +
		" user=" + dc.User +
		" password=" + dc.Password +
		" dbname=" + dc.DBName +
		" sslmode=" + dc.SSLMode
}
