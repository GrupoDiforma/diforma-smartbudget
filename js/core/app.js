document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 SmartBudget Diforma inicializado en modo Serverless.");
    
    // Inyectar versión dinámica como lo hacía GAS
    const versionStr = `V${new Date().toLocaleDateString('es-CO', {day:'2-digit', month:'2-digit'}).replace('/','.')}.${new Date().getHours()}${new Date().getMinutes()}`;
    document.getElementById('appVersionBadge').innerText = versionStr;

    mostrarStatus("Interfaz migrada exitosamente a HTML estático.", "success");
});

function mostrarStatus(msj, tipo) { 
  const a = document.getElementById('statusAlert'); 
  if (!a) return;
  a.className = `alert alert-${tipo} m-0 py-1 px-2`; 
  a.innerText = msj; 
  a.classList.remove('d-none'); 
  setTimeout(() => a.classList.add('d-none'), 5000); 
}
