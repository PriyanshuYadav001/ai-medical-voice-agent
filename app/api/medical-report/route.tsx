import { db } from "@/config/db";
import { openai } from "@/config/OpenAiModel";
import { SessionChartTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const REPORT_GEN_PROMPT=`You are an AI Medical Voice Agent. After a conversation with a patient, generate a medical session report with the following fields:
agent: The medical specialist's name (e.g., "General Physician AI").
user: The patient's name, or "Anonymous" if not provided.
timestamp: The current date and time in ISO format.
chiefComplaint: A one-sentence summary of the main health concern.
summary: A 2-3 sentence summary of the conversation, including symptoms and key details.
symptoms: A list of symptoms mentioned by the user.
duration: How long the user has experienced the symptoms.
severity: Severity of the symptoms (mild, moderate, or severe).
medicationsMentioned: A list of any medicines mentioned during the conversation.
recommendations: A list of AI suggestions (e.g., rest, see a doctor).
Return the result in the following JSON format:
json
{
  "agent": "string",
  "user": "string",
  "timestamp": "ISO Date string",
  "chiefComplaint": "string",
  "summary": "string",
  "symptoms": ["symptom1", "symptom2"],
  "duration": "string",
  "severity": "mild | moderate | severe",
  "medicationsMentioned": ["medicine1", "medicine2"],
  "recommendations": ["suggestion1", "suggestion2"]
}
Only include valid fields. Respond nothing else
Depends on doctor ai agent info and conversation between medical agent and user`

export async function POST(req:NextRequest) {
    const {sessionId,sessionDetail,messages}= await req.json();

    try{
        const UserInput="AI Doctor Agent Info: "+JSON.stringify(sessionDetail)+ ", Conversation:"+JSON.stringify(messages);
        const completion = await openai.chat.completions.create({
            model: 'google/gemini-2.0-flash-exp:free',
            messages: [
                   {role:'system', content:REPORT_GEN_PROMPT},
              {
                role: 'user',
                content:UserInput ,
              },
            ],
          });
          const rawResp=completion.choices[0].message;
          //@ts-ignore
          const Resp=rawResp.content.trim().replace('```json','').replace('```','')
          const JSONResp=JSON.parse(Resp);

          //Save to database
          const result= await db.update(SessionChartTable).set({
            report: JSONResp,
            conversation:messages
          }).where(eq(SessionChartTable.sessionId,sessionId));
          return NextResponse.json(JSONResp)
    }catch(e){
        return NextResponse.json(e);
    }
}