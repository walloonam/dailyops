use anyhow::Context;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub port: u16,
    pub ai_base_url: String,
    pub ai_model: String,
    pub cors_origins: Vec<String>,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url = std::env::var("DATABASE_URL").context("DATABASE_URL missing")?;
        let jwt_secret = std::env::var("JWT_SECRET").context("JWT_SECRET missing")?;
        let port = std::env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<u16>()
            .context("PORT invalid")?;
        let ai_base_url = std::env::var("AI_BASE_URL").unwrap_or_else(|_| "http://localhost:11434".to_string());
        let ai_model = std::env::var("AI_MODEL").unwrap_or_else(|_| "phi3.5:mini".to_string());
        let cors_origins = std::env::var("CORS_ORIGINS")
            .ok()
            .map(|raw| {
                raw.split(',')
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string())
                    .collect::<Vec<_>>()
            })
            .unwrap_or_else(|| {
                vec![
                    "http://localhost:5173".to_string(),
                    "http://localhost:4173".to_string(),
                ]
            });

        Ok(Self {
            database_url,
            jwt_secret,
            port,
            ai_base_url,
            ai_model,
            cors_origins,
        })
    }
}
