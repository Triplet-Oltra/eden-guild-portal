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