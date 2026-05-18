// All user-facing strings for Luz de Luna.
// Each entry: { en: "...", es: "..." }
//
// Editors:
//   - English: James (and anyone else native EN).
//   - Spanish: Angelina (and anyone else native ES, LATAM flavour — tú not usted).
//
// Rules:
//   - Use {name} / {handle} etc. for variables; the i18n helper substitutes them.
//   - Keys are namespaced by screen: `nav.start`, `intake.step1.title`, etc.
//   - When you add a string, add BOTH languages. The fallback is English.

export const SUPPORTED_LANGS = ["en", "es"];
export const DEFAULT_LANG = "en";

export const messages = {
  // === Navigation & shell ===
  "nav.start":   { en: "Start",        es: "Empezar" },
  "nav.coach":   { en: "Coach",        es: "Coach" },
  "nav.myPage":  { en: "My page",      es: "Mi página" },
  "nav.funding": { en: "Funding",      es: "Financiación" },

  "footer.body": {
    en: "Luz de Luna — a small, private business coach. Your answers stay in your browser unless you choose to share them.",
    es: "Luz de Luna — un pequeño coach de negocios, privado. Tus respuestas se quedan en tu navegador a menos que tú elijas compartirlas.",
  },
  "footer.copyright": { en: "© Luz de Luna", es: "© Luz de Luna" },

  // === Landing page (/) ===
  "landing.pill": { en: "A coach in your pocket", es: "Un coach en tu bolsillo" },
  "landing.heroTitle": {
    en: "Turn what you already know into real income — with a coach who's seen it work.",
    es: "Convierte lo que ya sabes en ingresos reales — con un coach que ha visto que funciona.",
  },
  "landing.heroBody": {
    en: "Luz de Luna is a business coach in your pocket. You bring your skill, your time, and what you already know. Sol helps you turn it into a real business that pays — using the new tools that let one person do what used to take a team.",
    es: "Luz de Luna es un coach de negocios en tu bolsillo. Tú traes tu talento, tu tiempo y lo que ya sabes. Sol te ayuda a convertirlo en un negocio real que paga — usando las nuevas herramientas que permiten que una sola persona haga lo que antes requería un equipo.",
  },
  "landing.ctaStart":  { en: "Start a session →", es: "Empieza una sesión →" },
  "landing.ctaFunders": { en: "For partners & funders", es: "Para aliados y financiadores" },
  "landing.card1.title": { en: "How it works", es: "Cómo funciona" },
  "landing.card1.body": {
    en: "Sol — your coach — asks you a few simple questions, listens, and helps you choose your first move this week. You walk away with one specific customer to message, a price, and a page you can share.",
    es: "Sol — tu coach — te hace algunas preguntas sencillas, te escucha y te ayuda a elegir tu primer paso esta semana. Te vas con un cliente específico a quien escribir, un precio y una página que puedes compartir.",
  },
  "landing.card2.title": { en: "What you can build", es: "Lo que puedes construir" },
  "landing.card2.body": {
    en: "A small business with online customers. A digital product you build once and sell many times. A platform that connects others. Whatever fits — the tools are here now, and you don't need to code.",
    es: "Un pequeño negocio con clientes en línea. Un producto digital que construyes una vez y vendes muchas. Una plataforma que conecta a otros. Lo que te encaje — las herramientas ya existen, y no necesitas saber programar.",
  },
  "landing.card3.title": { en: "You decide what's shared", es: "Tú decides qué se comparte" },
  "landing.card3.body": {
    en: "Your real name, your address, your photo — none of it is shared unless you say so. You control what your customers see.",
    es: "Tu nombre real, tu dirección, tu foto — nada se comparte a menos que tú lo decidas. Tú controlas lo que ven tus clientes.",
  },
  "landing.card4.title": { en: "Aimed high, on purpose", es: "Apuntamos alto, a propósito" },
  "landing.card4.body": {
    en: "The goal isn't a side hustle that buys groceries. It's a real income — the kind that pays the rent and then some. Sol plans with that target in mind from the first conversation.",
    es: "El objetivo no es un pasatiempo que pague el mercado. Es un ingreso real — del que paga el arriendo y más. Sol planifica con esa meta desde la primera conversación.",
  },
  "landing.firstStep.pill": { en: "First step", es: "Primer paso" },
  "landing.firstStep.title": { en: "Spend 10 minutes with Sol", es: "Pasa 10 minutos con Sol" },
  "landing.firstStep.body": {
    en: "By the end of one short conversation you'll have a specific person to message today, an offer with a price, and a page to share. No jargon. No business plan. Just a first move.",
    es: "Al final de una sola conversación corta tendrás una persona específica a la que escribir hoy, una oferta con precio y una página para compartir. Sin jerga. Sin plan de negocios. Solo un primer paso.",
  },
  "landing.firstStep.ctaStart": { en: "Start →", es: "Empezar →" },
  "landing.firstStep.ctaSample": { en: "See a sample page", es: "Ver una página de ejemplo" },

  // === Intake (/start) ===
  "intake.progress": { en: "Guided intake — step {step} of {total}", es: "Preguntas guiadas — paso {step} de {total}" },
  "intake.step1.title": { en: "Hello — let's start small.", es: "Hola — empecemos en pequeño." },
  "intake.step1.intro": {
    en: "We'll ask a few simple questions. There are no wrong answers. You can change anything later.",
    es: "Te haremos algunas preguntas sencillas. No hay respuestas equivocadas. Puedes cambiar cualquier cosa después.",
  },
  "intake.q.nameLabel": { en: "What name would you like to be called?", es: "¿Cómo te gustaría que te llamen?" },
  "intake.q.namePlaceholder": { en: "Just a first name is fine", es: "Solo un nombre está bien" },
  "intake.q.ideaLabel": { en: "Do you have a business idea already, or do you want help finding one?", es: "¿Ya tienes una idea de negocio, o quieres que te ayudemos a encontrar una?" },
  "intake.q.ideaPlaceholder": { en: "e.g. people often ask me to braid their hair, or I'm not sure yet", es: "ej. la gente siempre me pide que les trence el cabello, o no estoy segura todavía" },
  "intake.step2.title": { en: "What are you good at?", es: "¿En qué eres buena?" },
  "intake.step2.intro": {
    en: "Anything you do well counts — cooking, listening, fixing, selling, teaching, making.",
    es: "Cualquier cosa que hagas bien cuenta — cocinar, escuchar, arreglar, vender, enseñar, crear.",
  },
  "intake.q.skillsLabel": { en: "List a few things you're good at, in your own words", es: "Cuenta algunas cosas en las que eres buena, con tus palabras" },
  "intake.q.skillsPlaceholder": { en: "e.g. I cook well, I'm patient with kids, I can sew, I'm good at making people feel welcome", es: "ej. cocino bien, soy paciente con los niños, sé coser, sé hacer que la gente se sienta bienvenida" },
  "intake.q.offerTypeLabel": { en: "What kind of business sounds most like you?", es: "¿Qué tipo de negocio se parece más a ti?" },
  "intake.offerType.service": { en: "A service (I do something for people)", es: "Un servicio (hago algo para la gente)" },
  "intake.offerType.product": { en: "A product (I sell or make something)", es: "Un producto (vendo o fabrico algo)" },
  "intake.offerType.class":   { en: "A class or lessons (I teach something)", es: "Una clase o lecciones (enseño algo)" },
  "intake.offerType.content": { en: "Content (videos, voice notes, writing)", es: "Contenido (videos, notas de voz, escritura)" },
  "intake.offerType.unsure":  { en: "I'm not sure yet", es: "No estoy segura todavía" },
  "intake.step3.title": { en: "Your time and tools", es: "Tu tiempo y tus herramientas" },
  "intake.q.hoursLabel": { en: "How many hours each week could you give to this?", es: "¿Cuántas horas a la semana podrías dedicarle?" },
  "intake.hours.suffix": { en: "hours", es: "horas" },
  "intake.q.channelsLabel": { en: "Which of these can you use? (pick any that apply)", es: "¿Cuáles de estas puedes usar? (elige las que apliquen)" },
  "intake.step4.title": { en: "Safety and privacy", es: "Seguridad y privacidad" },
  "intake.step4.intro": {
    en: "You are in control of what gets shared. We will hide what you ask to hide.",
    es: "Tú decides qué se comparte. Vamos a ocultar lo que pidas ocultar.",
  },
  "intake.q.safetyLabel": { en: "Are there safety or privacy worries we should think about?", es: "¿Hay preocupaciones de privacidad o seguridad que debamos tener en cuenta?" },
  "intake.q.safetyPlaceholder": { en: "e.g. don't show my full name, don't show my area, don't show my photo", es: "ej. no mostrar mi nombre completo, no mostrar mi zona, no mostrar mi foto" },
  "intake.q.realNameLabel": { en: "Do you want your real name shown on your business page?", es: "¿Quieres que aparezca tu nombre real en tu página de negocio?" },
  "intake.realName.yes": { en: "Yes, my real name is fine", es: "Sí, mi nombre real está bien" },
  "intake.realName.no":  { en: "No, please use a first name or nickname", es: "No, usa solo mi nombre o un apodo" },
  "intake.q.publicNameLabel": { en: "A public name to use (optional)", es: "Un nombre público para usar (opcional)" },
  "intake.q.publicNamePlaceholder": { en: "e.g. Amina, or Little Moon Kitchen", es: "ej. Amina, o Cocina Lunita" },
  "intake.btnContinue": { en: "Continue →", es: "Continuar →" },
  "intake.btnBack":     { en: "← Back", es: "← Atrás" },
  "intake.btnSave":     { en: "Save & close", es: "Guardar y cerrar" },
  "intake.btnMeetCoach":{ en: "Meet your coach →", es: "Conoce a tu coach →" },
  "intake.footnote": {
    en: "Your answers are saved only in this browser session for the prototype demo. Nothing is sent anywhere.",
    es: "Tus respuestas se guardan solo en esta sesión del navegador para la demo. No se envían a ningún lado.",
  },

  // === Coach / Architect (/architect) ===
  "coach.title": { en: "Sol — your coach", es: "Sol — tu coach" },
  "coach.stateLabel.greeting":        { en: "Hello",                  es: "Hola" },
  "coach.stateLabel.skill_exploration":{ en: "What you do well",       es: "Lo que haces bien" },
  "coach.stateLabel.first_customer_id":{ en: "Your first customer",    es: "Tu primer cliente" },
  "coach.stateLabel.offer_proposal":  { en: "Your first offer",        es: "Tu primera oferta" },
  "coach.stateLabel.action_drafted":  { en: "Your first message",      es: "Tu primer mensaje" },
  "coach.stateLabel.marketing_plan":  { en: "Your marketing plan",     es: "Tu plan de marketing" },
  "coach.stateLabel.done":            { en: "Ready to send",           es: "Listo para enviar" },
  "coach.pillSuffix": { en: " · with Sol", es: " · con Sol" },
  "coach.noIntakeTitle": { en: "Let's start with a few questions first", es: "Empecemos con unas preguntas primero" },
  "coach.noIntakeBody": {
    en: "Sol — your coach — works best with a little bit of context. Tell us a few quick things about yourself first.",
    es: "Sol — tu coach — funciona mejor con un poco de contexto. Cuéntanos algunas cosas rápidas sobre ti primero.",
  },
  "coach.noIntakeCta": { en: "Start →", es: "Empezar →" },
  "coach.thinking": { en: "thinking…", es: "pensando…" },
  "coach.composer.placeholder": { en: "Type your reply…", es: "Escribe tu respuesta…" },
  "coach.composer.send": { en: "Send", es: "Enviar" },
  "coach.composer.sending": { en: "Sending…", es: "Enviando…" },
  "coach.composer.restart": { en: "Start over", es: "Empezar de nuevo" },
  "coach.composer.shortcut": { en: "Press {kbd} to send.", es: "Pulsa {kbd} para enviar." },
  "coach.offerCard.pill": { en: "Your first offer", es: "Tu primera oferta" },
  "coach.offerCard.priceLabel": { en: "Price:", es: "Precio:" },
  "coach.offerCard.deliverLabel": { en: "Deliver:", es: "Entrega:" },
  "coach.offerCard.firstCustomerLabel": { en: "First customer:", es: "Primer cliente:" },
  "coach.offerCard.scalingLabel": { en: "How this grows to USD 2,500/month:", es: "Cómo crece esto a USD 2,500/mes:" },
  "coach.skillGap.pill": { en: "Skill to add", es: "Habilidad para sumar" },
  "coach.marketing.pill": { en: "Your 30-day marketing engine", es: "Tu motor de marketing de 30 días" },
  "coach.marketing.dailyLabel": { en: "Daily:", es: "Cada día:" },
  "coach.marketing.weeklyLabel": { en: "Weekly:", es: "Cada semana:" },
  "coach.marketing.toolsLabel": { en: "Use these tools:", es: "Usa estas herramientas:" },
  "coach.marketing.firstPost": { en: "FIRST POST — copy this", es: "PRIMER POST — copia esto" },
  "coach.marketing.goalLabel": { en: "30-day goal:", es: "Meta a 30 días:" },
  "coach.draftedMessage.pill": { en: "Send this today", es: "Envía esto hoy" },
  "coach.draftedMessage.copyBtn": { en: "Copy message", es: "Copiar mensaje" },
  "coach.draftedMessage.copied": { en: "Copied!", es: "¡Copiado!" },
  "coach.draftedMessage.waBtn": { en: "Open in WhatsApp →", es: "Abrir en WhatsApp →" },
  "coach.shopReady.pill": { en: "Your shareable page", es: "Tu página para compartir" },
  "coach.shopReady.title": { en: "Your page is ready", es: "Tu página está lista" },
  "coach.shopReady.body": {
    en: 'Share this link when someone asks "where can I see what you do?"',
    es: 'Comparte este enlace cuando alguien te pregunte "¿dónde puedo ver lo que haces?"',
  },
  "coach.shopReady.cta": { en: "Open your page →", es: "Abrir tu página →" },
  "coach.done.newPlan": { en: "Start a new plan", es: "Empezar un nuevo plan" },

  // === Me dashboard (/me) ===
  "me.welcome": { en: "Welcome back, {name}.", es: "Bienvenida de nuevo, {name}." },
  "me.pageAt": { en: "Your page is at", es: "Tu página está en" },
  "me.intro": {
    en: "This is where you can add to it, change it, and see what you've made.",
    es: "Aquí puedes sumarle cosas, cambiarla y ver lo que has creado.",
  },
  "me.offerCardTitle": { en: "Your offer", es: "Tu oferta" },
  "me.sectionsTitle": { en: "Sections on your page", es: "Secciones de tu página" },
  "me.sectionsEmpty": { en: "Nothing extra yet. Sol can help you add things below.", es: "Nada extra todavía. Sol puede ayudarte a sumar cosas abajo." },
  "me.sectionRemove": { en: "Remove", es: "Quitar" },
  "me.seePage": { en: "See your page →", es: "Ver tu página →" },
  "me.builder.pill": { en: "Talk to Sol — the builder", es: "Habla con Sol — la constructora" },
  "me.builder.title": { en: "Make your page better, one piece at a time", es: "Mejora tu página, una pieza a la vez" },
  "me.builder.intro": {
    en: "Tell Sol what you'd like to add. She'll propose one thing at a time and only add it if you say yes.",
    es: "Dile a Sol lo que quieres sumar. Ella te propondrá una cosa a la vez y solo la agregará si dices que sí.",
  },
  "me.builder.welcomeGreeting": {
    en: "Hi {name}. Want me to suggest something to add to your page? Or tell me what you have in mind.",
    es: "Hola {name}. ¿Quieres que te sugiera algo para sumar a tu página? O cuéntame qué tienes en mente.",
  },
  "me.builder.composerPlaceholder": { en: "Or tell Sol what you'd like to add or change…", es: "O dile a Sol qué quieres sumar o cambiar…" },
  "me.builder.proposesPill": { en: "Sol proposes — {type}", es: "Sol propone — {type}" },
  "me.builder.accept": { en: "Looks good — add it to my page", es: "Me gusta — agrégalo a mi página" },
  "me.builder.reject": { en: "Show me a different one", es: "Muéstrame otra opción" },
  "me.suggestion.next":      { en: "What should I add next?", es: "¿Qué debería sumar ahora?" },
  "me.suggestion.testimonial": { en: "Add a testimonial", es: "Agregar un testimonio" },
  "me.suggestion.service":   { en: "Add another service", es: "Agregar otro servicio" },
  "me.suggestion.faq":       { en: "Add an FAQ", es: "Agregar una pregunta frecuente" },
  "me.suggestion.promo":     { en: "Add a promo banner", es: "Agregar un banner de promoción" },
  "me.suggestion.instagram": { en: "Add my Instagram link", es: "Agregar mi enlace de Instagram" },
  "me.noPageTitle": { en: "You don't have a page yet", es: "Todavía no tienes una página" },
  "me.noPageBody":  { en: "Spend 10 minutes with Sol to get your first one.", es: "Pasa 10 minutos con Sol para tener la primera." },
  "me.noPageCta":   { en: "Start with Sol →", es: "Empezar con Sol →" },
  "me.photo.heading": { en: "Photos in this gallery", es: "Fotos en esta galería" },
  "me.photo.urlPlaceholder": { en: "…or paste a photo URL", es: "…o pega la URL de una foto" },
  "me.photo.captionPlaceholder": { en: "caption (optional)", es: "leyenda (opcional)" },
  "me.photo.addUrl": { en: "Add URL", es: "Agregar URL" },
  "me.photo.remove": { en: "Remove", es: "Quitar" },
  "me.photo.note": {
    en: "Photos are stored locally in your browser. Keep them small — under 1MB each for best results.",
    es: "Las fotos se guardan localmente en tu navegador. Mantenlas pequeñas — menos de 1MB cada una para mejor resultado.",
  },

  // === Shop / shareable page (/shop/[handle]) ===
  "shop.about": { en: "About", es: "Sobre mí" },
  "shop.about.body": {
    en: "I'm {name}. I'm taking on a small number of customers right now, so I can do a great job for each one. Send me a message and I'll reply quickly.",
    es: "Soy {name}. Estoy aceptando un número pequeño de clientes ahora mismo, para poder hacer un buen trabajo para cada uno. Escríbeme y te respondo rápido.",
  },
  "shop.about.privacy": {
    en: "I keep my real name and address private. Orders are confirmed by message.",
    es: "Mantengo mi nombre real y dirección privados. Los pedidos se confirman por mensaje.",
  },
  "shop.whatToOrder": { en: "What you can order", es: "Lo que puedes pedir" },
  "shop.delivered": { en: "Delivered:", es: "Entrega:" },
  "shop.from": { en: "From", es: "Desde" },
  "shop.howToOrder": { en: "How to order", es: "Cómo pedir" },
  "shop.howToOrder.body": {
    en: "Send a message. Tell me what you'd like. I'll reply quickly and confirm.",
    es: "Envíame un mensaje. Cuéntame qué quieres. Te respondo rápido y confirmo.",
  },
  "shop.messageMe": { en: "Message me", es: "Escríbeme" },
  "shop.messageWA": { en: "Message on WhatsApp", es: "Escríbeme por WhatsApp" },
  "shop.promise": { en: "My promise", es: "Mi promesa" },
  "shop.promise.body": {
    en: "I do what I say I'll do, when I say I'll do it. If anything is off, tell me first and I'll make it right.",
    es: "Hago lo que digo que voy a hacer, cuando digo que lo voy a hacer. Si algo no sale bien, dime primero y lo arreglo.",
  },
  "shop.findMeToo": { en: "Find me here too", es: "Encuéntrame también aquí" },
  "shop.photosComingSoon": { en: "(Photos coming soon.)", es: "(Las fotos llegarán pronto.)" },
  "shop.bookingComing": { en: "(Booking link coming.)", es: "(Enlace de reservas en camino.)" },
  "shop.emailComing": { en: "(Email collection coming soon.)", es: "(Recolección de emails muy pronto.)" },
  "shop.socialComing": { en: "(coming soon)", es: "(muy pronto)" },
  "shop.notFoundTitle": { en: "This page isn't set up yet", es: "Esta página todavía no está lista" },
  "shop.notFoundBody": {
    en: "If you're the owner, finish the coach conversation first — your page gets generated at the end.",
    es: "Si tú eres la dueña, termina la conversación con el coach primero — tu página se genera al final.",
  },
  "shop.notFoundCta": { en: "Go to the coach →", es: "Ir al coach →" },
  "shop.footerMade": { en: "Page made with", es: "Página hecha con" },
  "shop.footerEdit": { en: "Edit this page", es: "Editar esta página" },

  // === Generic / shared ===
  "common.loading": { en: "Loading…", es: "Cargando…" },
  "common.copy": { en: "Copy", es: "Copiar" },
  "common.copied": { en: "Copied!", es: "¡Copiado!" },
  "common.connectionHiccup": { en: "Connection hiccup. Try sending again.", es: "Hubo un problema de conexión. Intenta enviar de nuevo." },
};
