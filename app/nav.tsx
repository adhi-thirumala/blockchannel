import { useState } from 'react';
import WalletButton from "./components/WalletButton";

export default function Nav() {
  const [isError, setIsError] = useState(false);

  return(
    <div className="navbar bg-base-100 shadow-sm">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl">Blockchannel</a>
        {isError && (
          <div className="badge badge-error ml-2">Network error</div>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <input type="text" placeholder="Search" className="input input-bordered w-full md:w-auto" />
        <WalletButton />
      </div>
    </div>
  );
}
