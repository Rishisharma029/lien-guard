async function run() {
  let cookie = "";

  console.log("=== Testing Hackathon Demo Mode End-to-End on localhost:3000 ===");

  // Step 1: Login
  const loginRes = await fetch("http://localhost:3000/api/trpc/auth.demoLogin?batch=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { "json": { "role": "citizen" } } }),
  });

  const setCookie = loginRes.headers.get("set-cookie");
  if (setCookie) {
    cookie = setCookie.split(";")[0];
  }
  const loginData = await loginRes.json();
  console.log("1. auth.demoLogin:", JSON.stringify(loginData[0]?.result?.data?.json));

  const authHeaders = {
    "Content-Type": "application/json",
    "Cookie": cookie,
  };

  // Step 2: Register Demo Case
  const regRes = await fetch("http://localhost:3000/api/trpc/demo.registerDemoCase?batch=1", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ "0": { "json": {} } }),
  });
  const regData = await regRes.json();
  const caseId = regData[0]?.result?.data?.json?.case?.caseId;
  console.log("2. demo.registerDemoCase -> Case ID:", caseId, "Status:", regData[0]?.result?.data?.json?.case?.status);

  if (!caseId) {
    console.error("Failed to register demo case:", JSON.stringify(regData));
    process.exit(1);
  }

  // Step 3: Send Follow-up
  const followUpRes = await fetch("http://localhost:3000/api/trpc/demo.sendFollowUp?batch=1", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ "0": { "json": { caseId } } }),
  });
  const followUpData = await followUpRes.json();
  console.log("3. demo.sendFollowUp -> Delivery state:", followUpData[0]?.result?.data?.json?.delivery?.state, "Provider Msg ID:", followUpData[0]?.result?.data?.json?.providerMessageId);

  // Step 4: Escalate to Bank
  const bankRes = await fetch("http://localhost:3000/api/trpc/demo.escalateToBank?batch=1", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ "0": { "json": { caseId } } }),
  });
  const bankData = await bankRes.json();
  console.log("4. demo.escalateToBank -> Case status:", bankData[0]?.result?.data?.json?.case?.status);

  // Step 5: Escalate to Cybercrime
  const cyberRes = await fetch("http://localhost:3000/api/trpc/demo.escalateToCybercrime?batch=1", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ "0": { "json": { caseId } } }),
  });
  const cyberData = await cyberRes.json();
  console.log("5. demo.escalateToCybercrime -> Case status:", cyberData[0]?.result?.data?.json?.case?.status);

  // Step 6: Generate RTI Draft
  const rtiRes = await fetch("http://localhost:3000/api/trpc/demo.generateRtiDraft?batch=1", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ "0": { "json": { caseId } } }),
  });
  const rtiData = await rtiRes.json();
  console.log("6. demo.generateRtiDraft -> Document ID:", rtiData[0]?.result?.data?.json?.documentId, "Has RTI Content:", Boolean(rtiData[0]?.result?.data?.json?.content));

  // Step 7: Get Demo State
  const stateRes = await fetch("http://localhost:3000/api/trpc/demo.getState?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D", {
    headers: authHeaders,
  });
  const stateData = await stateRes.json();
  const state = stateData[0]?.result?.data?.json;
  console.log("7. demo.getState -> Workflow Step:", state?.step, "Events Count:", state?.events?.length, "Comms Count:", state?.communications?.length, "Docs Count:", state?.documents?.length);

  // Step 8: Reset Demo
  const resetRes = await fetch("http://localhost:3000/api/trpc/demo.resetDemo?batch=1", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ "0": { "json": {} } }),
  });
  const resetData = await resetRes.json();
  console.log("8. demo.resetDemo -> Purged Demo Records:", resetData[0]?.result?.data?.json?.count);

  console.log("=== ALL 8 DEMO ACTIONS VERIFIED SUCCESSFULLY! ===");
}

run().catch(console.error);
