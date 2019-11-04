build:
	docker build -t theorm/histograph .

run:
	docker run \
		--rm -it \
		-p 8000:8000 \
		--name histograph \
		-v $(PWD)/settings.js:/histograph/settings.js \
		-v $(PWD)/contents:/histograph/contents \
		theorm/histograph \
		node server.js

run-db:
	docker run -it \
		-p 7474:7474 -p 7473:7473 -p 7687:7687 \
		-v ~/.neo4j/histograph:/data neo4j