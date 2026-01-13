use anyhow::Context;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub port: u16,
    pub ai_base_url: String,
    pub ai_model: String,
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
        Ok(Self {
            database_url,
            jwt_secret,
            port,
            ai_base_url,
            ai_model,
        })
    }
}
