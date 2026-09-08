from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "SMS Marketing API"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sms_marketing"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str = "dev-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # SMS Providers
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    vonage_api_key: str = ""
    vonage_api_secret: str = ""

    orange_api_client_id: str = ""
    orange_api_client_secret: str = ""

    # 3MI (LeSMSBUS)
    smsbus_base_url: str = "https://www.lesmsbus.com:7170/ines.smsbus"
    smsbus_username: str = ""
    smsbus_password: str = ""
    smsbus_id: str = ""
    smsbus_sender_id: str = "SMSPro"
    smsbus_dlr_callback_url: str = "https://un8duodw9i.execute-api.eu-west-1.amazonaws.com/production/v1/webhooks/3mi/dlr?token=b9b7299177084bbdfdf8b66ee69b6a1a0c9a2e35ddc106ab661311e06875dcf9&msg=DLR_STATUS&dnr=numero&msgId=id_du_message"  # URL de callback DLR communiquée à 3MI
    smsbus_webhook_secret: str = "b9b7299177084bbdfdf8b66ee69b6a1a0c9a2e35ddc106ab661311e06875dcf9"  # Token secret ajouté à l'URL DLR pour valider l'origine

    # WhatsApp Business API (Meta Cloud API)
    whatsapp_api_version: str = "v21.0"
    whatsapp_api_base_url: str = "https://graph.facebook.com"
    whatsapp_verify_token: str = ""

    # Facebook App (Embedded Signup)
    facebook_app_id: str = ""
    facebook_app_secret: str = ""
    facebook_config_id: str = ""

    # AWS
    aws_region: str = "eu-west-1"
    aws_sqs_queue_url: str = ""
    aws_s3_bucket: str = ""

    # Billing / Orange Money
    subscription_monthly_price: int = 25000
    orange_money_merchant_code: str = ""
    orange_money_merchant_name: str = "SMS Pro"
    orange_money_qr_code_url: str = ""

    # Rate Limiting
    rate_limit_per_minute: int = 100

    # CORS — origines autorisées (séparées par des virgules)
    allowed_origins: str = "http://localhost:3000,http://localhost:3001,https://localhost:3000,https://localhost:3001"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
