"use client";

import Link from "next/link";
import { DemoActionLink } from "@/components/layout/demoActions";
import roleitems, { adminNavItems, guestNavItems } from "./roleitems";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { login } from "@/store/userSlice";
import { refreshFields } from "@/lib/utils/cultivation/fields/fields";
import { refreshGeneralManager } from "@/lib/utils/managers/generalManager";
import { ROLE_STATUSES } from "@/lib/constants/users";
import { useRouter } from "next/navigation";
import {
  CULTIVATION_MANAGER,
  FINANCIAL_MANAGER,
  PRODUCTION_MANAGER,
  WAREHOUSE_MANAGER,
  GENERAL_MANAGER,
} from "@/lib/constants/users/managerTypes";
import fillProductionRedux from "@/lib/utils/production";
import { fillWarehouseRedux } from "@/lib/utils/storage";
import { fillCartRedux } from "@/lib/utils/webstore/cart";
import { fillOrdersRedux } from "@/lib/utils/webstore/orders";
import { fillWarehouseRequestsRedux } from "@/lib/utils/documents/requests";
import { fillManagersSelection } from "@/store/managers";
import {
  fetchEmploymentRequests,
  fetchWorkerById,
  fetchWorkers,
} from "@/store/workers";
import { fetchProcurments } from "@/store/procurments";
import { MdVpnKey } from "@react-icons/all-files/md/MdVpnKey";
import { LogoutSolid, UserSolid } from "@mynaui/icons-react";

export default {
  roleitems,
};

export function Navbar() {
  const { data: session, status } = useSession();
  const authenticated = Boolean(session?.user);
  return (
    <div className="z-[200] navbar relative h-16 bg-[var(--navbar-bg)] flex items-center px-10 text-[var(--text-navbar)]">
      <div className="flex-1 flex justify-start items-center">
        {" "}
        <NavLogo />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 flex gap-8">
        <NavItems />
      </div>
      <div className=" flex-1 flex justify-end items-center gap-8 ">
        {authenticated ? (
          <button
            type="button"
            aria-label="Odjava"
            className="cursor-pointer"
            onClick={() => signOut({ redirectTo: "/autorizacija" })}
          >
            <LogoutSolid />
          </button>
        ) : status !== "loading" && (
          <Link href="/autorizacija" aria-label="Prijava">
            <MdVpnKey className="text-xl -mt-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

function NavLogo() {
  return (
    <h1 className="text-lg font-bold">
      <Link href="/">FvTracker</Link>
    </h1>
  );
}

function canShowManagerLinks(user) {
  return Boolean(user?.managerModelName &&
    (!user.roleStatus || user.roleStatus === ROLE_STATUSES.APPROVED) &&
    (user.managerModelName !== GENERAL_MANAGER ||
      user.generalManagerRequest === ROLE_STATUSES.APPROVED));
}

function getNavItems(user, status) {
  if (status === "loading") return [];
  if (!user) return guestNavItems;
  if (user.isAdmin) return adminNavItems;
  if (user.workerType) return user.employed ? roleitems[user.workerType] || [] : [];
  return canShowManagerLinks(user) ? roleitems[user.managerModelName] || [] : [];
}

function NavItems() {
  const { data: session, status } = useSession();
  const items = getNavItems(session?.user, status);
  const dispatch = useDispatch();
  const router = useRouter();
  const generalManagerRedux = useSelector(
    (state) => state.generalManager?.manager,
  );
  const fieldsRedux = useSelector((state) => state.cultivation.fields);
  const cartItems = useSelector((state) => state.webstore.cart.items);

  useEffect(() => {
    if (status === "authenticated" && canShowManagerLinks(session?.user)) {
      dispatch(fetchWorkers(session.user.managerModelName));
      const managerModelName = session.user.managerModelName;
      dispatch(login(session.user));
      dispatch(fetchProcurments());
      if (
        managerModelName === GENERAL_MANAGER ||
        managerModelName === FINANCIAL_MANAGER
      ) {
        dispatch(fetchEmploymentRequests());
        refreshFields({ dispatch, router, generalManager: true, fieldsRedux });
        fillProductionRedux({ dispatch, router, all: true });
      }
      if (
        managerModelName === CULTIVATION_MANAGER &&
        !fieldsRedux &&
        session.user?.roleStatus === ROLE_STATUSES.APPROVED
      ) {
        console.log("refreshing fields for cultivation manager from navbar");
        refreshFields({ dispatch, router, fieldsRedux });
      }
      if (managerModelName === "GeneralManager" && !generalManagerRedux) {
        refreshGeneralManager({ dispatch });
        if (!fieldsRedux) {
          refreshFields({
            dispatch,
            router,
            generalManager: true,
            fieldsRedux,
          });
        }
      }
      if (managerModelName === PRODUCTION_MANAGER) {
        console.log(
          "production manager logged in, refreshing producti data...",
        );
        fillProductionRedux({ dispatch, router });
      }
      if (managerModelName === WAREHOUSE_MANAGER) {
        console.log(
          "warehouse manager logged in, refreshing warehouse data...",
        );
        fillWarehouseRedux({ dispatch });
      }
      if (
        managerModelName === FINANCIAL_MANAGER ||
        managerModelName === GENERAL_MANAGER
      ) {
        console.log(
          "refreshing orders and requests data for financial/general/warehouse manager...",
        );
        fillOrdersRedux({ dispatch, router });
        fillWarehouseRequestsRedux({ dispatch });
      }
      if (managerModelName === FINANCIAL_MANAGER) {
        console.log(
          "financial manager logged in, refreshing warehouse requests data...",
        );

        dispatch(fillManagersSelection({ managersType: "warehouseManagers" }));
      }
    } else if (status === "unauthenticated") {
      console.log("user is unauthenticated, refreshing products...");
      fillCartRedux({ dispatch, cartItems });
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && session.user?.isAdmin) {
      refreshGeneralManager({ dispatch });
      dispatch(login(session.user));
      dispatch(fetchWorkers());
      fillOrdersRedux({ dispatch, router });
      fillWarehouseRequestsRedux({ dispatch });
      fetchEmploymentRequests();
      refreshFields({ dispatch, router, generalManager: true, fieldsRedux });
      fillProductionRedux({ dispatch, router, all: true });
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && session.user?.workerType) {
      console.log("User is a worker, setting worker nav items");
      dispatch(login(session.user));
      if (!session.user.employed) {
        console.log("User is not employed, skipping worker data refresh");
        return;
      }
      if (session.user.workerType === "ProductionWorker") {
        console.log("Production worker logged in, refreshing product data...");
        fillProductionRedux({ dispatch, router });
      }
      if (session.user.workerType === "WarehouseWorker") {
        console.log("Warehouse worker logged in, refreshing warehouse data...");
        fillWarehouseRedux({ dispatch });
      }
      if (session.user.workerType === "FinancialWorker") {
        console.log(
          "Financial worker logged in, refreshing orders and requests data...",
        );
        fillOrdersRedux({ dispatch, router });
        fillWarehouseRequestsRedux({ dispatch });
        dispatch(fillManagersSelection({ managersType: "warehouseManagers" }));
      }
      dispatch(fetchWorkerById(session.user?.workerId));
    }
  }, [status]);

  return (
    <>
      {items.map((item, index) => (
        <NavItem key={index} item={item} />
      ))}
    </>
  );
}

function NavItem({ item }) {
  const [subMenuOpen, setSubmenuOpen] = useState(false);
  if (item.submenu) {
    return (
      <div
        onMouseEnter={() => setSubmenuOpen(true)}
        onMouseLeave={() => setSubmenuOpen(false)}
        className="relative group "
      >
        <span className="cursor-pointer hover:text-blue-900 transition-colors duration-200 hover:[-webkit-text-stroke:0.5px_black]">
          {item.label}
        </span>
        <div
          className={`absolute top-full left-0  w-48 bg-gray-800 text-white rounded shadow-lg ${subMenuOpen ? "block" : "hidden"}`}
        >
          {item.submenu.map((subItem, index) => {
            const ItemLink = subItem.mutatesData ? DemoActionLink : Link;
            return (
              <ItemLink
                key={index}
                href={subItem.path}
                className="block w-full px-4 py-2 text-left hover:bg-gray-600"
              >
                {subItem.label}
              </ItemLink>
            );
          })}
        </div>
      </div>
    );
  } else {
    return (
      <Link
        href={item.path}
        className="hover:text-blue-900 transition-colors duration-200  hover:[-webkit-text-stroke:0.5px_black]"
      >
        {item.label}
      </Link>
    );
  }
}

function getManager(dispatch) {}
