
// TechMaint: βασική πλοήγηση και λειτουργικότητα

let screenHistory = [];
let currentScreen = 'screen-home';
let map;
let stationMarkers = {};

const fieldIds = [
  'service-category',
  'location-select',
  'equipment',
  'description',
  'priority',
  'contact-name',
  'contact-phone'
];

// 1. Πλοήγηση και ιστορικό
function showScreen(screenId, isBack = false) {
  if (screenId === currentScreen) {
    window.scrollTo(0, 0);
    return;
  }

  if (
    currentScreen === 'screen-form' &&
    document.getElementById('confirmation-box').style.display === 'block'
  ) {
    resetSupportForm();
  }

  if (!isBack) {
    screenHistory.push(currentScreen);
  }

  currentScreen = screenId;

  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });

  document.getElementById(screenId).classList.add('active');

  const navMapping = {
    'screen-home': 'nav-home',
    'screen-services': 'nav-services',
    'screen-form': 'nav-form',
    'screen-map': 'nav-map'
  };

  document.querySelectorAll('.nav-btn').forEach(btn => {
    const active = btn.id === navMapping[screenId];

    btn.classList.toggle('active-nav', active);

    if (active) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  if (screenId === 'screen-map') {
    setTimeout(function() {
      if (map) {
        map.invalidateSize();
      }
    }, 100);
  }

  window.scrollTo(0, 0);
}

function navTo(screenId) {
  showScreen(screenId);
}

function goBack() {
  showScreen(screenHistory.pop() || 'screen-home', true);
}

// 2. Επιλογή υπηρεσίας και σημείου εξυπηρέτησης
function selectService(serviceName) {
  document.getElementById('service-category').value = serviceName;
  clearFieldError('service-category');
  showScreen('screen-form');
}

function selectStation(stationName) {
  if (map) {
    map.closePopup();
  }

  document.getElementById('location-select').value = stationName;
  clearFieldError('location-select');
  showScreen('screen-form');
}

function focusStation(key) {
  const marker = stationMarkers[key];

  if (!marker || !map) {
    return;
  }

  map.setView(marker.getLatLng(), 14);
  marker.openPopup();

  document.getElementById('map').scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
}

// 3. Διαχείριση σφαλμάτων φόρμας
function setFieldError(fieldId, message) {
  const el = document.getElementById(fieldId);
  const group = el.closest('.form-group');

  group.classList.add('has-error');
  el.setAttribute('aria-invalid', 'true');

  let msg = group.querySelector('.field-error');

  if (!msg) {
    msg = document.createElement('p');
    msg.className = 'field-error';
    group.appendChild(msg);
  }

  msg.textContent = message;
}

function clearFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  const group = el.closest('.form-group');

  group.classList.remove('has-error');
  el.removeAttribute('aria-invalid');

  const msg = group.querySelector('.field-error');

  if (msg) {
    msg.remove();
  }
}

function clearAllErrors() {
  fieldIds.forEach(clearFieldError);
}

// Καθαρισμός dropdown και προηγούμενου σφάλματος
function clearSelect(fieldId) {
  const select = document.getElementById(fieldId);

  select.value = '';
  clearFieldError(fieldId);

  select.dispatchEvent(
    new Event('change', { bubbles: true })
  );

  select.focus();
}

// 4. Στοιχεία επιβεβαίωσης
function addDetail(container, label, value) {
  const p = document.createElement('p');
  const strong = document.createElement('strong');

  strong.textContent = label + ': ';

  p.appendChild(strong);
  p.appendChild(document.createTextNode(value));

  container.appendChild(p);
}

function makeTicketNumber() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');

  return 'TM-' +
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    Math.floor(100 + Math.random() * 900);
}

// 5. Έλεγχος και προσομοίωση υποβολής
function submitForm(event) {
  event.preventDefault();

  const value = id => document.getElementById(id).value.trim();

  const service = value('service-category');
  const location = value('location-select');
  const equipment = value('equipment');
  const equipmentCode = value('equipment-code');
  const description = value('description');
  const priority = value('priority');
  const contactName = value('contact-name');
  const contactPhone = value('contact-phone');

  const errorMsg = document.getElementById('form-error');

  clearAllErrors();

  const checks = [
    [
      'service-category',
      !service,
      'Επιλέξτε κατηγορία υπηρεσίας.'
    ],
    [
      'location-select',
      !location,
      'Επιλέξτε εγκατάσταση.'
    ],
    [
      'equipment',
      !equipment,
      'Επιλέξτε τύπο εξοπλισμού.'
    ],
    [
      'description',
      description.length < 10,
      'Η περιγραφή πρέπει να έχει τουλάχιστον 10 χαρακτήρες.'
    ],
    [
      'priority',
      !priority,
      'Επιλέξτε προτεραιότητα.'
    ],
    [
      'contact-name',
      !contactName,
      'Συμπληρώστε το ονοματεπώνυμο.'
    ],
    [
      'contact-phone',
      !/^(69\d{8}|2\d{9})$/.test(contactPhone),
      'Συμπληρώστε έγκυρο 10ψήφιο ελληνικό κινητό ή σταθερό.'
    ]
  ];

  let firstInvalid = null;

  checks.forEach(([id, invalid, message]) => {
    if (invalid) {
      setFieldError(id, message);

      if (!firstInvalid) {
        firstInvalid = document.getElementById(id);
      }
    }
  });

  if (firstInvalid) {
    errorMsg.textContent =
      'Παρακαλώ διορθώστε τα πεδία που επισημαίνονται με κόκκινο.';

    errorMsg.style.display = 'block';

    firstInvalid.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    firstInvalid.focus({ preventScroll: true });

    return;
  }

  errorMsg.style.display = 'none';

  document.getElementById('support-form').style.display = 'none';

  const confirmationBox = document.getElementById('confirmation-box');
  const detailsBox = document.getElementById('confirmation-details');

  detailsBox.textContent = '';

  addDetail(detailsBox, 'Αριθμός Αιτήματος', makeTicketNumber());
  addDetail(detailsBox, 'Ημερομηνία / Ώρα', new Date().toLocaleString('el-GR'));
  addDetail(detailsBox, 'Εγκατάσταση', location);
  addDetail(detailsBox, 'Υπηρεσία', service);
  addDetail(detailsBox, 'Εξοπλισμός', equipment);

  if (equipmentCode) {
    addDetail(detailsBox, 'Κωδικός Εξοπλισμού', equipmentCode);
  }

  addDetail(detailsBox, 'Προτεραιότητα', priority);
  addDetail(detailsBox, 'Περιγραφή', description);

  addDetail(
    detailsBox,
    'Επικοινωνία',
    contactName + ' (' + contactPhone + ')'
  );

  confirmationBox.style.display = 'block';

  window.scrollTo(0, 0);
}

// Επαναφορά φόρμας για νέο αίτημα
function resetSupportForm() {
  const form = document.getElementById('support-form');

  form.reset();
  form.style.display = 'block';

  document.getElementById('confirmation-box').style.display = 'none';
  document.getElementById('form-error').style.display = 'none';
  document.getElementById('confirmation-details').textContent = '';

  clearAllErrors();
}

// 6. Leaflet + OpenStreetMap
function initMap() {
  if (typeof L === 'undefined') {
    document.getElementById('map').textContent =
      'Ο χάρτης χρειάζεται σύνδεση στο Internet για να φορτώσει.';
    return;
  }

  map = L.map('map').setView([38.00, 23.65], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const stations = [
    {
      key: 'aigaleo',
      lat: 37.989,
      lng: 23.676,
      name: 'Κέντρο Δυτικής Αττικής (Αιγάλεω)',
      specialty: 'Υποστήριξη PLC, CNC & Αυτοματισμών',
      formValue: 'Κέντρο Αιγάλεω'
    },
    {
      key: 'aspropyrgos',
      lat: 38.061,
      lng: 23.589,
      name: 'Βιομηχανικός Σταθμός Ασπροπύργου',
      specialty: 'Βαριά Μηχανήματα & Υδραυλικά Συστήματα',
      formValue: 'Σταθμός Ασπροπύργου'
    },
    {
      key: 'piraeus',
      lat: 37.947,
      lng: 23.642,
      name: 'Τεχνική Βάση Πειραιά',
      specialty: 'Ηλεκτρομηχανολογικές Επισκευές',
      formValue: 'Τεχνική Βάση Πειραιά'
    }
  ];

  stations.forEach(station => {
    const marker = L.marker([
      station.lat,
      station.lng
    ]).addTo(map);

    stationMarkers[station.key] = marker;

    const popup = document.createElement('div');

    const name = document.createElement('strong');
    name.textContent = station.name;

    const specialty = document.createElement('p');
    specialty.textContent = station.specialty;

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'popup-btn';
    action.textContent = 'Υποβολή Αιτήματος εδώ';

    action.addEventListener('click', () => {
      selectStation(station.formValue);
    });

    popup.append(name, specialty, action);

    marker.bindPopup(popup);
  });
}

// 7. Αρχικοποίηση πεδίων και χάρτη
document.addEventListener('DOMContentLoaded', function() {
  fieldIds.forEach(id => {
    const el = document.getElementById(id);

    el.addEventListener('input', () => {
      clearFieldError(id);
    });

    el.addEventListener('change', () => {
      clearFieldError(id);
    });
  });

  const phone = document.getElementById('contact-phone');

  phone.addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '').slice(0, 10);
  });

  initMap();
});
