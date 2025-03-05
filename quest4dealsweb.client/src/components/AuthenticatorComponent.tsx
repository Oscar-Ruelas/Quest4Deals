// src/components/AuthenticatorComponent.tsx
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

function AuthenticatorComponent() {
    return (
        <Authenticator>
            {({ signOut, user }) =>
                user ? (
                    <div>
                        <span>Welcome, {user.username}</span>
                        <button onClick={signOut}>Sign Out</button>
                    </div>
                ) : (
                    <p>Please sign in</p>
                )
            }
        </Authenticator>
    );
}

export default AuthenticatorComponent;
