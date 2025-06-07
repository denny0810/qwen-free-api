import _ from "lodash";

import Request from "@/lib/request/Request.ts";
import Response from "@/lib/response/Response.ts";
import chat from "@/api/controllers/chat.ts";

// 容器环境变量 `CHAT_AUTHORIZATION` 
const CHAT_AUTHORIZATION = process.env.CHAT_AUTHORIZATION;
const DEBUG_MODE = process.env.DEBUG_MODE;

export default {
  prefix: "/v1/chat",

  post: {
    "/completions": async (request: Request) => {
      // console.log('[DEBUG] All headers:', request.headers);
      // console.log('[DEBUG] Raw authorization:', request.headers.authorization);
      request
        .validate('body.conversation_id', v => _.isUndefined(v) || _.isString(v))
        .validate("body.messages", _.isArray)
        .validate("headers.authorization", _.isString);
      if (DEBUG_MODE === 'ON' || DEBUG_MODE === 'on') {
        console.log('[DEBUG] Raw authorization:', request.headers.authorization);
      }
      
      // Check if authorization header exists and has enough characters
      const authHeader = request.headers.authorization;
      const authContent = authHeader && authHeader.startsWith("Bearer ") 
        ? authHeader.slice(7) // Remove "Bearer " prefix
        : "";
       
      // Use CHAT_AUTHORIZATION if authContent is less than 30 characters or undefined
      if (!authContent || authContent.length < 30) {
        request.headers.authorization = "Bearer " + CHAT_AUTHORIZATION;
      }
      // ticket切分
      const tokens = chat.tokenSplit(request.headers.authorization);
      // 随机挑选一个ticket
      const token = _.sample(tokens);

      if (DEBUG_MODE === 'ON' || DEBUG_MODE === 'on') {
        console.log('[DEBUG] CHAT_AUTHORIZATION:', CHAT_AUTHORIZATION);
        console.log('[DEBUG] Using authHeader:', request.headers.authorization);
        console.log('[DEBUG] Tokens:', tokens);
        console.log('[DEBUG] Token:', token);
      }
      
      const { model, conversation_id: convId, messages, search_type, stream } = request.body;
      if (stream) {
        const stream = await chat.createCompletionStream(
          model,
          messages,
          search_type,
          token,
          convId
        );
        return new Response(stream, {
          type: "text/event-stream",
        });
      } else
        return await chat.createCompletion(
          model,
          messages,
          search_type,
          token,
          convId
        );
    },
  },
};
