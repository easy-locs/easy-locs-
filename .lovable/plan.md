
# Essai gratuit de 3 jours

## Modifications

### 1. Migration base de donnees
- Ajouter colonne `trial_ends_at` (timestamptz, nullable) a la table `subscriptions`
- Modifier la fonction `handle_new_user()` pour inserer automatiquement un trial de 3 jours : `plan = 'trial'`, `status = 'trialing'`, `trial_ends_at = now() + interval '3 days'`

### 2. Edge Function `check-subscription`
Apres la verification Stripe, si aucun abonnement actif :
- Lire la ligne `subscriptions` de l'utilisateur
- Si `status = 'trialing'` et `trial_ends_at > now()` : retourner `subscribed: true, plan: "trial"`
- Si trial expire : mettre a jour `status = 'inactive'`, `plan = 'free'`, retourner `subscribed: false`

### 3. Frontend - AuthContext
- Ajouter `isTrial: boolean` et `trialDaysLeft: number | null` au state global
- `isTrial = true` quand `plan === "trial"`

### 4. Frontend - Billing page
- Banniere trial : "Essai gratuit - X jours restants" avec barre de progression
- Message d'encouragement a souscrire
- Quand expire : "Votre essai gratuit est termine"

### 5. ProtectedRoute
Aucun changement : le trial retourne `subscribed: true`, donc l'acces reste autorise.

---

## Details techniques

### Migration SQL
```text
ALTER TABLE public.subscriptions ADD COLUMN trial_ends_at timestamptz;

CREATE OR REPLACE FUNCTION public.handle_new_user() ...
  -- Ajouter apres creation org_members :
  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at)
  VALUES (NEW.id, 'trial', 'trialing', now() + interval '3 days');
```

### check-subscription (logique ajoutee)
```text
Si pas d'abonnement Stripe actif :
  -> SELECT * FROM subscriptions WHERE user_id = ...
  -> Si status = 'trialing' AND trial_ends_at > now()
       -> subscribed = true, plan = 'trial', subscription_end = trial_ends_at
  -> Sinon
       -> UPDATE status = 'inactive', plan = 'free'
       -> subscribed = false
```

### AuthContext - SubscriptionState
```text
isTrial: boolean
trialDaysLeft: number | null  (calcule depuis subscription_end)
```
