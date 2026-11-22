"use client";

import { MANAGER_TRANSLATION } from "@/lib/constants/users/managerTypes";
import { WORKER_TRANSLATION } from "@/lib/constants/users/workers";
import { useSelector } from "react-redux";
import { WorkerProfile } from "./workers";

export default function ProfileComponent({ user }) {
  const worker = useSelector((state) => state.workers.worker);
  const isLoading = useSelector((state) => state.workers.isLoading);
  const currentWorker = worker?._id && worker._id === user.workerId ? worker : null;

  return (
    <div>
      <CommonProfilePage {...user} />
      {user.employed && currentWorker && (
        <WorkerProfile worker={currentWorker} workerType={user.workerType} />
      )}
      {user.employed && isLoading && !currentWorker && (
        <div role="status" className="mt-4 max-w-sm space-y-2 motion-safe:animate-pulse">
          <span className="sr-only">Učitavanje podataka o radu</span>
          <div aria-hidden="true" className="h-4 w-1/2 rounded bg-gray-200" />
          <div aria-hidden="true" className="h-3 w-3/4 rounded bg-gray-200" />
        </div>
      )}
    </div>
  );
}

const CommonProfilePage = ({
  email,
  employed,
  workerType,
  managerModelName,
  isAdmin,
  roleStatus,
  name,
  username,
  generalManagerRequest,
}) => {
  const profileRole = () => {
    if (isAdmin) {
      return "Administrator";
    } else if (workerType) {
      return (
        <>
          <div>{WORKER_TRANSLATION[workerType]}</div>
          <div>{employed ? "Zaposlen" : "Nezaposlen"}</div>
        </>
      );
    } else if (managerModelName) {
      return (
        <>
          <div>{MANAGER_TRANSLATION[managerModelName]}</div>
          <div>
            Zahtjev za ulogu:{" "}
            {roleStatus?.toLowerCase() || generalManagerRequest?.toLowerCase()}
          </div>
        </>
      );
    }
  };
  return (
    <div className="mb-2">
      <div className="text-2xl font-bold underline mb-2">{name}</div>
      <div>{profileRole()}</div>
      <div>Korisničko ime: {username}</div>
      <div>Email: {email}</div>
    </div>
  );
};
