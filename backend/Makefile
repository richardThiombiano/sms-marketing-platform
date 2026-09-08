# ─── SMS Marketing API — Commandes de déploiement ────────────────

.PHONY: build deploy deploy-staging local validate clean logs

# ─── Développement local ─────────────────────────────────────────

local:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# ─── SAM Build & Deploy ──────────────────────────────────────────

validate:
	sam validate --lint

build:
	sam build

deploy: build
	sam deploy

deploy-staging: build
	sam deploy --config-env staging

deploy-guided: build
	sam deploy --guided

# ─── Logs ────────────────────────────────────────────────────────

logs-api:
	sam logs -n ApiFunction --stack-name sms-marketing-api --tail

logs-scheduler:
	sam logs -n SchedulerFunction --stack-name sms-marketing-api --tail

logs-automation:
	sam logs -n AutomationWorkerFunction --stack-name sms-marketing-api --tail

logs-sms-worker:
	sam logs -n SmsWorkerFunction --stack-name sms-marketing-api --tail

# ─── Utilitaires ─────────────────────────────────────────────────

clean:
	rm -rf .aws-sam/

invoke-local:
	sam local invoke ApiFunction --event events/api-health.json

start-local-api:
	sam local start-api --port 3001
