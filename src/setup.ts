import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function setup() {
  console.log('\n🔧 Ditto Setup\n');
  console.log('This will store your API keys in the OS keychain.\n');

  let keytar: typeof import('keytar');
  try {
    keytar = await import('keytar');
  } catch {
    console.error(
      'Error: keytar is not available. Set secrets via environment variables instead.',
    );
    console.error('See .env.example for required variables.\n');
    process.exit(1);
  }

  const SERVICE = 'ditto-assistant';

  console.log('LLM Providers (set at least one):\n');

  const anthropicKey = await ask('  Anthropic API key (sk-ant-..., enter to skip): ');
  if (anthropicKey) {
    await keytar.setPassword(SERVICE, 'ANTHROPIC_API_KEY', anthropicKey);
    console.log('    ✓ Anthropic API key stored');
  }

  const googleKey = await ask('  Google AI API key (enter to skip): ');
  if (googleKey) {
    await keytar.setPassword(SERVICE, 'GOOGLE_AI_API_KEY', googleKey);
    console.log('    ✓ Google AI API key stored');
  }

  console.log('\nOther services:\n');

  const githubToken = await ask('  GitHub token (ghp_...): ');
  if (githubToken) {
    await keytar.setPassword(SERVICE, 'GITHUB_TOKEN', githubToken);
    console.log('    ✓ GitHub token stored');
  }

  const picovoiceKey = await ask('  Picovoice access key: ');
  if (picovoiceKey) {
    await keytar.setPassword(SERVICE, 'PICOVOICE_ACCESS_KEY', picovoiceKey);
    console.log('    ✓ Picovoice access key stored');
  }

  console.log('\n✅ Setup complete!');
  console.log('Configure LLM routing in .env (see presets in .env.example)');
  console.log('Then run: pnpm start\n');
  rl.close();
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
