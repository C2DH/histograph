build:
	docker build -t c2dhunilu/histograph .

run:
	docker run \
		--rm -it \
		-p 8000:8000 \
		--name histograph \
		-v $(PWD)/settings.js:/histograph/settings.js \
		-v $(PWD)/contents:/histograph/contents \
		c2dhunilu/histograph \
		node server.js

run-db:
	docker run -it \
	  -e NEO4J_AUTH="neo4j/neo4jpwd" \
		-p 7474:7474 -p 7473:7473 -p 7687:7687 \
		-v $(HOME)/.neo4j/histograph:/data neo4j