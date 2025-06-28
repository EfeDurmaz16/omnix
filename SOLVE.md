[ X ] Video generation does not work yet, I guess we should store the generated video in the database and then display it
[ ] We should implement web search functionality 
[ ] We should implement file upload functionality
[ ] We should implement a way to delete videos
[ ] We should implement a way to edit videos
[ ] We should change the UI to be more user friendly
[ ] We should add context windows to LLM's 
[ ] We should make sure that the LLM's are not hallucinating
[ ] We should make sure that the LLM's are remembering the context of the conversation
[ ] We should make sure that for all users, the LLM's are using a distinct context window
[ ] We should prioritize privacy, and not store any data that is not necessary
[ ] We should prioritize security 
[ ] We should start to implement paying system (i plan to use stripe, google pay, apple pay, etc. for that.)

# Stripe is not available in Turkey, maybe we should also provide other payment methods, 
- Such as bank transfer, credit card, etc. 

# Very high priority
[ ] Shift OPENAI models to use Azure OpenAI

# Here is the documentation for the Azure OpenAI models, we should use the following models:
https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models?tabs=global-standard%2Cstandard-chat-completions

# And also check that we should use the locations where maximum number of models are available

# it is either eastus2 or swedencentral

[ ] There are lots of models available in Azure OpenAI, we should maybe use them:

# there are cost efficient ones
# there are ones that are more powerful
# there are ones that are more accurate
# there are ones that are more fast

[ ] Then if we have a lot of models, we should implement a search bar
[ ] Then we should implement a suggestion tabs maybe like this:

- Cost efficient models
- Powerful models
- Multi-modal models

[ ] Add ElevenLabs, Higgsfield, Midjourney, Sora, Mistral, DeepSeek, and Groq to the list of models

[ ] We should not depend on one API endpoint for any model, we should have multiple endpoints for each to decrease downtime

- In example, we should have multiple endpoints for OpenAI, its own API, and Azure OpenAI
- Claude from its own API, and Google Vertex AI, AWS Bedrock, etc.