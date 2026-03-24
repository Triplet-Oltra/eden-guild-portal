// Configurazione Supabase
const supabaseUrl = 'https://nakznpzquspjnfccqbsk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ha3pucHpxdXNwam5mY2NxYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTA5NDUsImV4cCI6MjA4OTkyNjk0NX0.6cl-3kFrXBRdX3Bm95RtVVs3TvdpHjVI6QqQGnzo8fI'; // Quella che trovi sotto "anon" "public"
const supabase = Supabase.createClient(supabaseUrl, supabaseKey);

console.log("Connessione a Supabase inizializzata!");
// Funzione per cambiare sezione (Database, Gilda, ecc.)
function showSection(sectionId) {
    // Nasconde tutte le sezioni
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(s => s.style.display = 'none');

    // Mostra solo quella cliccata
    const activeSection = document.getElementById('sec-' + sectionId);
    if (activeSection) {
        activeSection.style.display = 'block';
    }

    // Opzionale: cambia stile al bottone cliccato per farlo sembrare "attivo"
}

// Qui sotto incolla tutto il resto del codice che carica i JSON 
// e gestisce la ricerca degli oggetti...