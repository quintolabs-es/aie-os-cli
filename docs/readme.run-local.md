### Use in `aie-os` project

### Initialize and build for AIE OS

```bash
cd aie-os
docker compose -f docker-compose.yaml build
docker compose -f docker-compose.yaml run --rm aie-os init \
  --project-path aie-os \
  --kb-path aie-os/content/knowledge-base \
  --agent-path aie-os/content/agent \
  --agent-persona software-developer \
  --skills-path aie-os/content/skills \
  --languages typescript \
  --application-type cli 

docker compose -f docker-compose.yaml run --rm aie-os build --project-path aie-os
```
