import "dotenv/config"
import readline from "readline/promises"
import { ChatMistralAI } from "@langchain/mistralai"
import { HumanMessage, tool, createAgent } from "langchain";
import { sendEmail } from "./mail.service.js";
import { tavily } from "@tavily/core";
import * as z from "zod";

const tvly = new tavily({
    apiKey: process.env.TAVILY_API_KEY
});

const searchTool = tool(
    async ({query}) =>  {
        const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },

            body:JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query: query,
                search_depth: "basic"
            })
        })
        const data = await res.json()
        return data.results.map(result => `${result.title}: ${result.link}`).join("\n")
    },
    {
        name: "searchInternet",
        description: "search the internet fot latest news or information",
        schema: z.object({
            query: z.string()
        })
    }
)


const emailTool = tool(
    sendEmail,
    {
        name: "emailTool",
        description: "Use this tool to send an email",
        schema: z.object({
            to: z.string().describe("The recipient's email address"),
            html: z.string().describe("The HTML content of the email"),
            subject: z.string().describe("The subject of the email"),
        })
    }
)

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const model = new ChatMistralAI({
    model: "mistral-small-latest",
})

const agent = createAgent({
    model,
    tools:[ emailTool,searchTool ]
})

const messages = []

while (true) {
    const userInput = await rl.question("\x1b[32mYou: \x1b[0m ")
    // console.log(`\x1b[32m[You]\x1b[0m ${userInput}`);

    messages.push(new HumanMessage(userInput))
    

    const response = await agent.invoke({messages})

    const aiMessage = response.messages[ response.messages.length - 1]

    messages.push(aiMessage)

    // console.log(response);
    

    console.log(`\x1b[34m[AI]: \x1b[0m ${aiMessage.content}`);
}



rl.close()