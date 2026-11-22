import {
  CULTIVATION_MANAGER,
  PRODUCTION_MANAGER,
  WAREHOUSE_MANAGER,
  FINANCIAL_MANAGER,
} from "@/lib/constants/users/managerTypes";
import {
  CULTIVATION_MANAGER_USERNAME,
  PRODUCTION_MANAGER_USERNAME,
  WAREHOUSE_MANAGER_USERNAME,
  FINANCIAL_MANAGER_USERNAME,
} from "@/lib/constants/users/managersUsernameModel";

const demoRoles = [
  {
    id: "cultivation",
    title: "Menad\u017eer kultivacije",
    description: "Pregledajte polja, kulture i planove sadnje i berbe.",
    username: CULTIVATION_MANAGER_USERNAME,
    managerType: CULTIVATION_MANAGER,
    passwordEnv: "DEMO_CULTIVATION_PASSWORD",
    destination: "/upravljanje-poljima/pregled",
  },
  {
    id: "production",
    title: "Menad\u017eer proizvodnje",
    description: "Pregledajte proizvode, sirovine i stanje zaliha.",
    username: PRODUCTION_MANAGER_USERNAME,
    managerType: PRODUCTION_MANAGER,
    passwordEnv: "DEMO_PRODUCTION_PASSWORD",
    destination: "/proizvodi",
  },
  {
    id: "warehouse",
    title: "Menad\u017eer skladi\u0161ta",
    description: "Pregledajte skladi\u0161ta, zalihe i zahtjeve za isporuku.",
    username: WAREHOUSE_MANAGER_USERNAME,
    managerType: WAREHOUSE_MANAGER,
    passwordEnv: "DEMO_WAREHOUSE_PASSWORD",
    destination: "/skladisne-jedinice",
  },
  {
    id: "financial",
    title: "Financijski menad\u017eer",
    description: "Pregledajte narud\u017ebe, otpremnice i nabavu.",
    username: FINANCIAL_MANAGER_USERNAME,
    managerType: FINANCIAL_MANAGER,
    passwordEnv: "DEMO_FINANCIAL_PASSWORD",
    destination: "/narudzbe",
  },
  {
    id: "worker",
    title: "Radnik u uzgoju",
    description: "Pogledajte polja i podatke o radu iz perspektive radnika.",
    username: "cwe",
    workerType: "CultivationWorker",
    passwordEnv: "DEMO_WORKER_PASSWORD",
    destination: "/upravljanje-poljima/pregled",
  },
];

export function getDemoRole(id) {
  return demoRoles.find(role => role.id === id);
}

export function getDemoCards() {
  return demoRoles.map(({ id, title, description }) => ({ id, title, description }));
}
