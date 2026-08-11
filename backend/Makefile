.PHONY: run build-lambda mint-token

run:
	set -a && . ./.env && set +a && go run ./cmd/server

build-lambda:
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -tags lambda.norpc -trimpath -ldflags="-s -w" -o bootstrap ./cmd/lambda

mint-token:
	set -a && . ./.env && set +a && go run ./cmd/minttoken --seed
