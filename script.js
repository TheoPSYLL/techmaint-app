// Κρατάμε ιστορικό οθονών (στοίβα) ώστε το κουμπί «Επιστροφή» να πηγαίνει πάντα στην προηγούμενη οθόνη
let screenHistory = [];
let currentScreen = 'screen-home';
let map; // Μεταβλητή για τον χάρτη Leaflet
let stationMarkers = {}; // Οι δείκτες του χάρτη ανά σημείο εξυπηρέτησης

// Τα πεδία της φόρμας που ελέγχονται
const fieldIds = ['service-category', 'location-select', 'equipment', 'description', 'priority', 'contact-name', 'contact-phone'];

// Επόμενο βήμα ανάλογα με την προτεραιότητα (προσομοίωση)
const nextSteps = {
  'Χαμηλή (Προγραμματισμένη)': 'Θα προγραμματιστεί επίσκεψη τεχνικού.',
  'Μεσαία (εντός 24 ωρών)': 'Ο τεχνικός θα επικοινωνήσει μαζί σας εντός 24 ωρών.',
  'Υψηλή / Επείγουσα (Διακοπή Παραγωγής)': 'Επείγον: ο τεχνικός θα επικοινωνήσει μαζί σας άμεσα (εντός 1 ώρας).'
};

// 1. Συνάρτηση εναλλαγής οθονών
function showScreen(screenId, isBack) {
  if (screenId === currentScreen) {
    window.scrollTo(0, 0);
    return;
  }

  // Αν φεύγουμε από τη φόρμα μετά από επιτυχή υποβολή, την καθαρίζουμε
  if (currentScreen === 'screen-form' &&
      document.getElementById('confirmation-box').style.display === 'block') {
    resetSupportForm();
  }

  // Αποθηκεύουμε την οθόνη που αφήνουμε (εκτός αν γυρνάμε πίσω)
  if (!isBack) {
    screenHistory.push(currentScreen);
  }
  currentScreen = screenId;

  // Κρύβουμε όλες τις οθόνες
  const screens = document.querySelectorAll('.screen');
  screens.forEach(function(screen) {
    screen.classList.remove('active');
  });

  // Εμφανίζουμε την επιλεγμένη οθόνη
  document.getElementById(screenId).classList.add('active');

  // Ενημερώνουμε το ενεργό κουμπί στο κάτω μενού
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.classList.remove('active-nav');
  });

  if (screenId === 'screen-home') document.getElementById('nav-home').classList.add('active-nav');
  if (screenId === 'screen-services') document.getElementById('nav-services').classList.add('active-nav');
  if (screenId === 'screen-form') document.getElementById('nav-form').classList.add('active-nav');
  if (screenId === 'screen-map') {
    document.getElementById('nav-map').classList.add('active-nav');
    // Ανανέωση μεγέθους του χάρτη Leaflet ώστε να εμφανιστεί σωστά
    setTimeout(function() {
      if (map) {
        map.invalidateSize();
      }
    }, 100);
  }

  window.scrollTo(0, 0);
}

// 2. Πλοήγηση από το κάτω μενού (το «Επιστροφή» γυρνά στην προηγούμενη οθόνη)
function navTo(screenId) {
  showScreen(screenId);
}

// 3. Συνάρτηση επιστροφής στην προηγούμενη οθόνη
function goBack() {
  const target = screenHistory.pop() || 'screen-home';
  showScreen(target, true);
}

// 4. Επιλογή υπηρεσίας (Γεμίζει το dropdown της φόρμας)
function selectService(serviceName) {
  document.getElementById('service-category').value = serviceName;
  clearFieldError('service-category');
  showScreen('screen-form');
}

// 5. Επιλογή σημείου εξυπηρέτησης από τον Χάρτη (Γεμίζει το dropdown της φόρμας)
function selectStation(stationName) {
  if (map) {
    map.closePopup();
  }
  document.getElementById('location-select').value = stationName;
  clearFieldError('location-select');
  showScreen('screen-form');
}

// 6. Από τη λίστα κάτω από τον χάρτη: εστίαση στον δείκτη και άνοιγμα του popup
function focusStation(key) {
  const marker = stationMarkers[key];
  if (!marker || !map) return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  map.setView(marker.getLatLng(), 14);
  marker.openPopup();
}

// Βοηθητική: προσθέτει μια γραμμή «Ετικέτα: τιμή» χωρίς innerHTML (ασφαλές για κείμενο χρήστη)
function addDetail(container, label, value) {
  const p = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = label + ': ';
  p.appendChild(strong);
  p.appendChild(document.createTextNode(value));
  container.appendChild(p);
}

// Βοηθητικές: μήνυμα σφάλματος κάτω από το συγκεκριμένο πεδίο
function setFieldError(fieldId, message) {
  const group = document.getElementById(fieldId).closest('.form-group');
  group.classList.add('has-error');
  let msg = group.querySelector('.field-error');
  if (!msg) {
    msg = document.createElement('p');
    msg.className = 'field-error';
    group.appendChild(msg);
  }
  msg.textContent = message;
}

function clearFieldError(fieldId) {
  const group = document.getElementById(fieldId).closest('.form-group');
  group.classList.remove('has-error');
  const msg = group.querySelector('.field-error');
  if (msg) msg.remove();
}

function clearAllErrors() {
  fieldIds.forEach(clearFieldError);
}

// Βοηθητική: αριθμός αιτήματος της μορφής TM-20270124-537 (προσομοίωση)
function makeTicketNumber() {
  const d = new Date();
  const pad = function(n) { return String(n).padStart(2, '0'); };
  const rand = Math.floor(100 + Math.random() * 900);
  return 'TM-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + rand;
}

// 7. Έλεγχος πεδίων φόρμας και προσομοίωση υποβολής
function submitForm(event) {
  event.preventDefault(); // Αποτρέπει την ανανέωση της σελίδας

  // Παίρνουμε όλες τις τιμές
  const service = document.getElementById('service-category').value.trim();
  const location = document.getElementById('location-select').value.trim();
  const equipment = document.getElementById('equipment').value.trim();
  const description = document.getElementById('description').value.trim();
  const priority = document.getElementById('priority').value.trim();
  const contactName = document.getElementById('contact-name').value.trim();
  const contactPhone = document.getElementById('contact-phone').value.trim();
  const errorMsg = document.getElementById('form-error');

  // Έλεγχος κάθε πεδίου ξεχωριστά: επισημαίνουμε ακριβώς ποια πεδία έχουν πρόβλημα
  clearAllErrors();
  const checks = [
    ['service-category', !service, 'Επιλέξτε κατηγορία υπηρεσίας.'],
    ['location-select', !location, 'Επιλέξτε εγκατάσταση.'],
    ['equipment', !equipment, 'Επιλέξτε τύπο εξοπλισμού.'],
    ['description', !description, 'Περιγράψτε το πρόβλημα.'],
    ['priority', !priority, 'Επιλέξτε προτεραιότητα.'],
    ['contact-name', !contactName, 'Συμπληρώστε το ονοματεπώνυμο.'],
    ['contact-phone', contactPhone.length !== 10,
      contactPhone.length === 0 ? 'Συμπληρώστε το τηλέφωνο.' : 'Το τηλέφωνο πρέπει να έχει ακριβώς 10 ψηφία.']
  ];

  let firstInvalid = null;
  checks.forEach(function(check) {
    if (check[1]) {
      setFieldError(check[0], check[2]);
      if (!firstInvalid) firstInvalid = document.getElementById(check[0]);
    }
  });

  if (firstInvalid) {
    errorMsg.textContent = 'Παρακαλώ διορθώστε τα πεδία που επισημαίνονται με κόκκινο.';
    errorMsg.style.display = 'block';
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstInvalid.focus();
    return;
  }

  errorMsg.style.display = 'none';

  // Απόκρυψη της φόρμας και εμφάνιση επιβεβαίωσης
  document.getElementById('support-form').style.display = 'none';
  const confirmationBox = document.getElementById('confirmation-box');
  const detailsBox = document.getElementById('confirmation-details');

  detailsBox.textContent = '';
  addDetail(detailsBox, 'Αριθμός Αιτήματος', makeTicketNumber());
  addDetail(detailsBox, 'Ημερομηνία / Ώρα', new Date().toLocaleString('el-GR'));
  addDetail(detailsBox, 'Εγκατάσταση', location);
  addDetail(detailsBox, 'Υπηρεσία', service);
  addDetail(detailsBox, 'Εξοπλισμός', equipment);
  addDetail(detailsBox, 'Προτεραιότητα', priority);
  addDetail(detailsBox, 'Περιγραφή', description);
  addDetail(detailsBox, 'Επικοινωνία', contactName + ' (' + contactPhone + ')');
  addDetail(detailsBox, 'Επόμενο βήμα', nextSteps[priority]);

  confirmationBox.style.display = 'block';
  window.scrollTo(0, 0);
}

// 8. Επαναφορά φόρμας για νέο αίτημα
function resetSupportForm() {
  document.getElementById('support-form').reset();
  document.getElementById('support-form').style.display = 'block';
  document.getElementById('confirmation-box').style.display = 'none';
  document.getElementById('form-error').style.display = 'none';
  clearAllErrors();
}

// 9. Αρχικοποίηση Χάρτη Leaflet + OpenStreetMap
window.onload = function() {
  // Κεντράρισμα στην Αττική
  map = L.map('map').setView([38.00, 23.65], 11);

  // Προσθήκη πλακιδίων OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Σημείο 1: Αιγάλεω
  const marker1 = L.marker([37.989, 23.676]).addTo(map);
  stationMarkers.aigaleo = marker1;
  marker1.bindPopup(
    '<b>Κέντρο Δυτικής Αττικής (Αιγάλεω)</b><br>' +
    'Υποστήριξη PLC, CNC & Αυτοματισμών.<br>' +
    '<button class="popup-btn" onclick="selectStation(\'Κέντρο Αιγάλεω\')">Υποβολή Αιτήματος εδώ</button>'
  );

  // Σημείο 2: Ασπρόπυργος
  const marker2 = L.marker([38.061, 23.589]).addTo(map);
  stationMarkers.aspropyrgos = marker2;
  marker2.bindPopup(
    '<b>Βιομηχανικός Σταθμός Ασπροπύργου</b><br>' +
    'Βαριά Μηχανήματα & Υδραυλικά Συστήματα.<br>' +
    '<button class="popup-btn" onclick="selectStation(\'Σταθμός Ασπροπύργου\')">Υποβολή Αιτήματος εδώ</button>'
  );

  // Σημείο 3: Πειραιάς
  const marker3 = L.marker([37.947, 23.642]).addTo(map);
  stationMarkers.piraeus = marker3;
  marker3.bindPopup(
    '<b>Τεχνική Βάση Πειραιά</b><br>' +
    'Ηλεκτρομηχανολογικές Επισκευές.<br>' +
    '<button class="popup-btn" onclick="selectStation(\'Τεχνική Βάση Πειραιά\')">Υποβολή Αιτήματος εδώ</button>'
  );
};

// Όταν ο χρήστης διορθώνει ένα πεδίο, εξαφανίζεται το σφάλμα του
fieldIds.forEach(function(id) {
  const el = document.getElementById(id);
  el.addEventListener('input', function() { clearFieldError(id); });
  el.addEventListener('change', function() { clearFieldError(id); });
});
