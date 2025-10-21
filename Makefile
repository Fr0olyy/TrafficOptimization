.PHONY: build run stop clean logs check-versions

build:
	docker-compose build --no-cache

run:
	docker-compose up -d
	@echo "✓ Server running at http://localhost:9000"

stop:
	docker-compose down

clean:
	docker-compose down -v --rmi all
	rm -rf frontend/dist frontend/node_modules

logs:
	docker-compose logs -f

check-versions:
	@echo "=== Checking versions in container ==="
	@docker-compose exec quantum-optimizer python3 --version
	@docker-compose exec quantum-optimizer /app/server --version 2>/dev/null || echo "Go binary built successfully"
	@docker-compose exec quantum-optimizer pip list | grep -E "numpy|pandas|requests"
