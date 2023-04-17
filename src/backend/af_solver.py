import logging
from dataclasses import dataclass
from typing import Dict, List, Optional

from clingo import Control

logger = logging.getLogger("af_solver")
logger.setLevel(logging.INFO)
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)
formatter = logging.Formatter("[%(asctime)s %(levelname)s %(name)s] %(message)s")
ch.setFormatter(formatter)
logger.addHandler(ch)


# stabe_web.dl
STABLE = """\
    %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    % Encoding for stable extensions
    %
    %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

    %% Guess a set S \subseteq A
    in(X) :- not out(X), arg(X).
    out(X) :- not in(X), arg(X).

    %% S has to be conflict-free
    :- in(X), in(Y), att(X,Y).

    %% The argument x is defeated by the set S
    defeated(X) :- in(Y), att(Y,X).

    %% S defeats all arguments which do not belong to S
    :- out(X), not defeated(X).

    #show in/1.
"""

# preferred-cond-disj.dl
PREFERRED = """\
in(X) :- not out(X), arg(X).
out(X) :- not in(X), arg(X).
:- in(X), in(Y), att(X,Y).
defeated(X) :- in(Y), att(Y,X).
not_defended(X) :- att(Y,X), not defeated(Y).
:- in(X), not_defended(X).
not_trivial :- out(X).
ecl(X) : out(X) :- not_trivial.
spoil | ecl(Z) : att(Z,Y) :- ecl(X), att(Y,X).
spoil :- ecl(X), ecl(Y), att(X,Y).
spoil :- in(X), ecl(Y), att(X,Y).
ecl(X) :- spoil, arg(X).
:- not spoil, not_trivial.
#show in/1. 
"""

STAGE = """\
in(X) :- not out(X), arg(X).
out(X) :- not in(X), arg(X).
:- in(X), in(Y), att(X,Y).
rge(X) :- in(X).
rge(Y) :- in(X),att(X,Y).
nrge(X) :- not rge(X),arg(X).
ok :- not rge(X), arg(X).
lrge(X) : nrge(X) :- ok.
lrge(X) :- rge(X), ok.
ecl(X) | ecl(Z) : att(Z,X) :- lrge(X), ok.
spoil :- ecl(X), ecl(Y), att(X,Y), ok.
ecl(X) :- spoil, arg(X), ok.
lrge(X) :- spoil, arg(X), ok.
:- not spoil, ok.

%not_stable :- arg(X), nrge(X).
#show in/1.
%nrge identifies arguments not in the range. Solutions containing nrge are not stable.
%#show nrge/1.
%#show not_stable/0.
"""

# stage-cond-disj.dl
STAGE_STABLE = """\
in(X) :- not out(X), arg(X).
out(X) :- not in(X), arg(X).
:- in(X), in(Y), att(X,Y).
rge(X) :- in(X).
rge(Y) :- in(X),att(X,Y).
nrge(X) :- not rge(X),arg(X).
ok :- not rge(X), arg(X).
lrge(X) : nrge(X) :- ok.
lrge(X) :- rge(X), ok.
ecl(X) | ecl(Z) : att(Z,X) :- lrge(X), ok.
spoil :- ecl(X), ecl(Y), att(X,Y), ok.
ecl(X) :- spoil, arg(X), ok.
lrge(X) :- spoil, arg(X), ok.
:- not spoil, ok.

not_stable :- arg(X), nrge(X).
#show in/1.
%nrge identifies arguments not in the range. Solutions containing nrge are not stable.
%#show nrge/1.
#show not_stable/0.
"""

# semi-cond-disj.dl
SEMI_STABLE = """\
in(X) :- not out(X), arg(X).
out(X) :- not in(X), arg(X).
:- in(X), in(Y), att(X,Y).
defeated(X) :- in(Y), att(Y,X).
not_defended(X) :- att(Y,X), not defeated(Y).
:- in(X), not_defended(X).
rge(X) :- in(X).
rge(Y) :- in(X),att(X,Y).
nrge(X) :- not rge(X),arg(X).
ok :- not rge(X), arg(X).
lrge(X) : nrge(X) :- ok.
lrge(X) :- rge(X), ok.
ecl(X) | ecl(Z) : att(Z,X) :- lrge(X), ok.
spoil :- ecl(X), ecl(Y), att(X,Y), ok.
spoil | ecl(Z) : att(Z,Y) :- ecl(X), att(Y,X), ok.
ecl(X) :- spoil, arg(X), ok.
lrge(X) :- spoil, arg(X), ok.
:- not spoil, ok.
#show in/1.
"""

# cf2_web.dl
CF2 = """\
lt(X,Y) :- arg(X),arg(Y), X<Y.
nsucc(X,Z) :- lt(X,Y), lt(Y,Z).
succ(X,Y) :- lt(X,Y), not nsucc(X,Y).
ninf(X) :- lt(Y,X).
nsup(X) :- lt(X,Y).
inf(X) :- not ninf(X), arg(X).
sup(X) :- not nsup(X), arg(X).

in(X)  :- not out(X), arg(X).
out(X) :- not in(X),  arg(X).
:- in(X), in(Y), att(X,Y).


arg_set(N,X) :- arg(X), inf(N).

reach(N,X,Y):-arg_set(N,X),arg_set(N,Y),att(X,Y).
reach(N,X,Y):-arg_set(N,X),att(X,Z),reach(N,Z,Y).
d(N,X) :- arg_set(N,Y), arg_set(N,X), in(Y), att(Y,X), not reach(N,X,Y).

arg_set(M,X) :- arg_set(N,X), succ(N,M), not d(N,X).

arg_new(X) :- sup(M), arg_set(M,X).
att_new(X,Y) :- arg_new(X), arg_new(Y), att(X,Y), reach(M,Y,X),  sup(M). 

conflicting(X) :- att_new(Y,X), out(X), in(Y).
conflicting(X) :- att_new(X,Y), out(X), in(Y).
conflicting(X) :- att_new(X,X).
:- not conflicting(X), out(X), arg_new(X).

#show in/1.
"""

# prefex.dl
PREFERRED_STABLE = """\
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Alternative encoding for preferred extensions
%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

%% Guess a set S \subseteq A
in(X) :- not out(X), arg(X).
out(X) :- not in(X), arg(X).

%% S has to be conflict-free
:- in(X), in(Y), att(X,Y).

%% The argument x is defeated by the set S
defeated(X) :- in(Y), att(Y,X).

% Arguments not defeated from outside extension
not_defeated(X) :- out(X), not defeated(X).


%% The argument x is not defended by S
not_defended(X) :- att(Y,X), not defeated(Y).

%% All arguments x \in S need to be defended by S (admissibility)
:- in(X), not_defended(X).

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Second part
% Find an admissible set U containing at least one element not in S
%   and not in conflict with S
% The result is that S is not preferred, since S \cup U is admissible.
% If you do not find it, then S is preferred
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

ecl(X) : out(X).
% spoil :- ecl(X), ecl(Y), X!=Y.
spoil | ecl(Z) : att(Z,Y) :- ecl(X), att(Y,X).
spoil :- ecl(X), ecl(Y), att(X,Y).
spoil :- in(X), ecl(Y), att(X,Y).
ecl(X) :- spoil, arg(X).
:- not spoil. 

not_stable :- arg(X), not_defeated(X).

%% Show only the arguments in the computed preferred extension
#show in/1.
% #show not_defeated/1.
#show not_stable/0.
"""

# cf2_gringo_versus_stable.lp
STABLE_CF2 = """\

lt(X,Y) :- arg(X),arg(Y), X<Y.
nsucc(X,Z) :- lt(X,Y), lt(Y,Z).
succ(X,Y) :- lt(X,Y), not nsucc(X,Y).
ninf(X) :- lt(Y,X).
nsup(X) :- lt(X,Y).
inf(X) :- not ninf(X), arg(X).
sup(X) :- not nsup(X), arg(X).

{in(X): arg(X)}.

:- in(X), in(Y), att(X,Y).


defeated(X) :- in(Y), att(Y,X).

not_defeated(X) :- not in(X), not defeated(X), arg(X).



arg_set(N,X) :- arg(X), inf(N).




reach(N,X,Y):-arg_set(N,X),arg_set(N,Y),att(X,Y).
reach(N,X,Y):-arg_set(N,X),att(X,Z),reach(N,Z,Y).
d(N,X) :- arg_set(N,Y), arg_set(N,X), in(Y), att(Y,X), not reach(N,X,Y).




arg_set(M,X) :- arg_set(N,X), succ(N,M), not d(N,X).




arg_new(X) :- sup(M), arg_set(M,X).
att_new(X,Y) :- arg_new(X), arg_new(Y), att(X,Y), reach(M,Y,X),  sup(M). 




conflicting(X) :- att_new(Y,X), not in(X), in(Y).
conflicting(X) :- att_new(X,Y), not in(X), in(Y).
conflicting(X) :- att_new(X,X).
:- not conflicting(X), not in(X), arg_new(X).

not_stable :- arg(X), not_defeated(X).

#show in/1.
%#show not_defeated/1.
#show not_stable/0.
"""

# stage2_gringo_versus_stable.lp
STAGE2_STABLE = """\

lt(X,Y) :- arg(X),arg(Y), X<Y.
nsucc(X,Z) :- lt(X,Y), lt(Y,Z).
succ(X,Y) :- lt(X,Y), not nsucc(X,Y).
ninf(X) :- lt(Y,X).
nsup(X) :- lt(X,Y).
inf(X) :- not ninf(X), arg(X).
sup(X) :- not nsup(X), arg(X).



defeated(X) :- in(Y), att(Y,X).

not_defeated(X) :- out(X), not defeated(X).



in(X)  :- not out(X), arg(X).
out(X) :- not in(X),  arg(X).
:- in(X), in(Y), att(X,Y).

% check if the guess is a naive extension

conflicting(X) :- att(Y,X), out(X), in(Y).
conflicting(X) :- att(X,Y), out(X), in(Y).
conflicting(X) :- att(X,X).
:- not conflicting(X), out(X), arg(X).



arg_set(N,X) :- arg(X), inf(N).




reach(N,X,Y):-arg_set(N,X),arg_set(N,Y),att(X,Y).
reach(N,X,Y):-arg_set(N,X),att(X,Z),reach(N,Z,Y).
d(N,X) :- arg_set(N,Y), arg_set(N,X), in(Y), att(Y,X), not reach(N,X,Y).




arg_set(M,X) :- arg_set(N,X), succ(N,M), not d(N,X).



arg_new(X) :- sup(M), arg_set(M,X).
att_new(X,Y) :- arg_new(X), arg_new(Y), att(X,Y), reach(M,Y,X),  sup(M). 


ltN(X,Y) :- arg_new(X),arg_new(Y), X<Y.
nsuccN(X,Z) :- ltN(X,Y), ltN(Y,Z).
succN(X,Y) :- ltN(X,Y), not nsuccN(X,Y).
ninfN(X) :- ltN(Y,X).
nsupN(X) :- ltN(X,Y).
infN(X) :- not ninfN(X), arg_new(X).
supN(X) :- not nsupN(X), arg_new(X).

in_range(X) :- in(X).
in_range(X) :- in(Y), att_new(Y,X).
not_in_range(X) :- arg_new(X), not in_range(X).

inN(X) | outN(X) :- arg_new(X).
% inN(X) ; outN(X) :- arg_new(X).

eqplus_upto(X) :- infN(X), in_range(X), in_rangeN(X).
eqplus_upto(X) :- infN(X), not_in_range(X), not_in_rangeN(X).
eqplus_upto(X) :- succN(Z,X), in_range(X), in_rangeN(X), eqplus_upto(Z).
eqplus_upto(X) :- succN(Z,X), not_in_range(X), not_in_rangeN(X), eqplus_upto(Z).

eqplus :- supN(X), eqplus_upto(X).



undefeated_upto(X,Y) :- infN(Y), outN(X), outN(Y).
undefeated_upto(X,Y) :- infN(Y), outN(X),  not att_new(Y,X).

undefeated_upto(X,Y) :- succN(Z,Y), undefeated_upto(X,Z), outN(Y).
undefeated_upto(X,Y) :- succN(Z,Y), undefeated_upto(X,Z), not att_new(Y,X).

not_in_rangeN(X) :- supN(Y), outN(X), undefeated_upto(X,Y).
in_rangeN(X) :- inN(X).
in_rangeN(X) :- outN(X), inN(Y), att_new(Y,X).

not_empty :- arg(X).
fail :- not not_empty.

fail :- inN(X), inN(Y), att_new(X,Y).

fail :- eqplus.

fail :- in_range(X), not_in_rangeN(X).

inN(X) :- fail, arg_new(X).
outN(X) :- fail, arg_new(X).

:- not fail.

not_stable :- arg(X), not_defeated(X).

#show in/1.
% #show not_defeated/1.
#show not_stable/0.

"""


SEMI_STABLE_STABLE = """\
in(X) :- not out(X), arg(X).
out(X) :- not in(X), arg(X).
:- in(X), in(Y), att(X,Y).
defeated(X) :- in(Y), att(Y,X).
not_defended(X) :- att(Y,X), not defeated(Y).
:- in(X), not_defended(X).
rge(X) :- in(X).
rge(Y) :- in(X),att(X,Y).
nrge(X) :- not rge(X),arg(X).
ok :- not rge(X), arg(X).
lrge(X) : nrge(X) :- ok.
lrge(X) :- rge(X), ok.
ecl(X) | ecl(Z) : att(Z,X) :- lrge(X), ok.
spoil :- ecl(X), ecl(Y), att(X,Y), ok.
spoil | ecl(Z) : att(Z,Y) :- ecl(X), att(Y,X), ok.
ecl(X) :- spoil, arg(X), ok.
lrge(X) :- spoil, arg(X), ok.
:- not spoil, ok.
not_stable :- arg(X), nrge(X).
#show in/1.
#show not_stable/0.
"""


@dataclass
class FasbPy:
    apx_filename: str
    output_n_models: int = 0
    stable_ctl: Optional[Control] = None
    preferred_ctl: Optional[Control] = None
    stage_ctl: Optional[Control] = None
    semistable_ctl: Optional[Control] = None
    cf2_ctl: Optional[Control] = None
    literal_mappings: Optional[Dict[str, int]] = None
    models: Optional[List[str]] = None

    def ground(self, include_path: str, encoding: str) -> Control:
        logger.info("ground")
        logger.debug(f"include_path:{include_path}")

        ctl = Control([str(self.output_n_models)])

        logger.info("loading apx")
        ctl.load(include_path)

        logger.info("adding encoding")
        ctl.add("base", [], encoding)

        ctl.ground([("base", [])])

        logger.info("constructing literal mappings")
        self.literal_mappings = {
            str(atom.symbol).split("(")[-1].split(")")[0]: atom.literal
            for atom in ctl.symbolic_atoms
            if "in(" in str(atom.symbol) # or "not_defeated(" in str(atom.symbol)
        }

        return ctl

    def solve(
        self,
        ctl: Control,
        route: List[str],
    ) -> int:
        logger.info("solve")
        logger.debug(f"ctl: {ctl}")
        logger.debug(f"route: {route}")
        logger.debug(f"output_n_models: {self.output_n_models}")

        assumptions = list(map(self.to_literal, route)) if route else []
        # print(assumptions)
        # print(self.literal_mappings["a83"])
        # print(self.literal_mappings)

        with ctl.solve(
            assumptions=assumptions,
            yield_=True,
        ) as handle:
            self.models = [f"{model}" for model in handle]
            n_extensions = len(self.models)
            logger.info(f"{n_extensions} extensions")

        return n_extensions

    def to_literal(self, atom: str) -> int:
        return (
            -self.literal_mappings.get(atom[1:], 0)
            if atom.startswith("#")
            else self.literal_mappings.get(atom, 0)
        )

    def stable(self, route: list[str] = []) -> int:
        logger.info("stable")
        logger.debug(f"route: {route}")

        encoding = STABLE

        if not self.stable_ctl:
            self.stable_ctl = self.ground(
                self.apx_filename,
                encoding,
            )
        ctl = self.stable_ctl

        logger.info("stable - OK")
        return self.solve(ctl, route)

    def preferred(self, route: List[str] = []) -> int:
        logger.info("preferred")
        logger.debug(f"route: {route}")

        encoding = PREFERRED

        if not self.preferred_ctl:
            self.preferred_ctl = self.ground(
                self.apx_filename,
                encoding,
            )
        ctl = self.preferred_ctl

        logger.info("preferred - OK")
        return self.solve(ctl, route)

    def stage(self, route: List[str] = []) -> int:
        logger.info("stage")
        logger.debug(f"route: {route}")

        encoding = STAGE

        if not self.stage_ctl:
            self.stage_ctl = self.ground(
                self.apx_filename,
                encoding,
            )
        ctl = self.stage_ctl

        logger.info("stage - OK")
        return self.solve(ctl, route)

    def semi_stable(self, route: List[str] = []) -> int:
        logger.info("semi_stable")
        logger.debug(f"route: {route}")

        encoding = SEMI_STABLE

        if not self.semistable_ctl:
            self.semistable_ctl = self.ground(
                self.apx_filename,
                encoding,
            )
        ctl = self.semistable_ctl

        logger.info("semi_stable - OK")
        return self.solve(ctl, route)

    def cf2(self, route: List[str] = []) -> int:
        logger.info("cf2")
        logger.debug(f"route: {route}")

        encoding = CF2

        if not self.cf2_ctl:
            self.cf2_ctl = self.ground(
                self.apx_filename,
                encoding,
            )
        ctl = self.cf2_ctl

        logger.info("cf2 - OK")
        return self.solve(ctl, route)

    def preferred_stable(self, route: List[str] = []) -> int:
        logger.info("preferred_stable")
        logger.debug(f"route: {route}")

        encoding = PREFERRED_STABLE

        if not self.preferred_ctl:
            self.preferred_ctl = self.ground(
                self.apx_filename,
                encoding,
            )
        ctl = self.preferred_ctl

        logger.info("preferred_stable - OK")
        return self.solve(ctl, route)

    def preferred_cf2(self, route: List[str] = []) -> int:
        logger.info("preferred_cf2")
        logger.debug(f"route: {route}")

        self.preferred(route)
        prf = list(map(lambda e: sorted(e.split(" ")), self.models))
        self.cf2(route)
        cf2 = list(map(lambda e: sorted(e.split(" ")), self.models))

        models = []
        for e in prf:
            if e in cf2:
                cf2.remove(e)
                e += ["01", "0", "1"]
            else:
                e += ["0"]
            models.append(e)
        for e in cf2:
            e += ["1"]
            models.append(e)

        self.models = [" ".join(model) for model in models]

        logger.info("preferred_cf2 - OK")
        return len(self.models)  # cardinality of union

    def preferred_semi_stable(self, route: List[str] = []) -> int:
        logger.info("preferred_semi_stable")
        logger.debug(f"route: {route}")

        self.preferred(route)
        prf = list(map(lambda e: sorted(e.split(" ")), self.models))
        self.semi_stable(route)
        semi_stable = list(map(lambda e: sorted(e.split(" ")), self.models))

        models = []
        for e in prf:
            if e in semi_stable:
                semi_stable.remove(e)
                e += ["01", "0", "1"]
            else:
                e += ["0"]
            models.append(e)
        for e in semi_stable:
            e += ["1"]
            models.append(e)

        self.models = [" ".join(model) for model in models]

        logger.info("preferred_semi_stable - OK")
        return len(models)  # cardinality of union

    def preferred_stage(self, route: List[str] = []) -> int:
        logger.info("preferred_stage")
        logger.debug(f"route: {route}")

        self.preferred(route)
        prf = list(map(lambda e: sorted(e.split(" ")), self.models))
        self.stage(route)
        stage = list(map(lambda e: sorted(e.split(" ")), self.models))

        models = []
        for e in prf:
            if e in stage:
                stage.remove(e)
                e += ["01", "0", "1"]
            else:
                e += ["0"]
            models.append(e)
        for e in stage:
            e += ["1"]
            models.append(e)

        self.models = [" ".join(model) for model in models]

        logger.info("preferred_stage - OK")
        return len(models)  # cardinality of union

    def stable_semi_stable(self, route: List[str] = []) -> int:
        logger.info(f"stable_semi_stable")
        logger.debug(f"route: {route}")

        encoding = SEMI_STABLE_STABLE

        if not self.stable_ctl:
            self.stable_ctl = self.ground(self.apx_filename, encoding)
        ctl = self.stable_ctl

        logger.info("stable_semi_stable - OK")
        return self.solve(ctl, route)

    def stable_stage(self, route: List[str] = []) -> int:
        logger.info(f"stable_stage")
        logger.debug(f"route: {route}")

        encoding = STAGE_STABLE

        if not self.stable_ctl:
            self.stable_ctl = self.ground(self.apx_filename, encoding)
        ctl = self.stable_ctl

        logger.info("stable_stage - OK")
        return self.solve(ctl, route)

    def stable_cf2(self, route: List[str] = []) -> int:
        logger.info("stable_cf2")
        logger.debug(f"route: {route}")

        encoding = STABLE_CF2

        if not self.stable_ctl:
            self.stable_ctl = self.ground(self.apx_filename, encoding)
        ctl = self.stable_ctl

        logger.info("stable_cf2 - OK")
        return self.solve(ctl, route)

    def stage_semi_stable(self, route: List[str] = []) -> int:
        logger.info("stage_semi_stable")
        logger.debug(f"route: {route}")

        self.stage(route)
        stage = list(map(lambda e: sorted(e.split(" ")), self.models))
        self.semi_stable(route)
        semi_stable = list(map(lambda e: sorted(e.split(" ")), self.models))

        models = []
        for e in stage:
            if e in semi_stable:
                semi_stable.remove(e)
                e += ["01", "0", "1"]
            else:
                e += ["0"]
            models.append(e)
        for e in semi_stable:
            e += ["1"]
            models.append(e)

        self.models = [" ".join(model) for model in models]

        logger.info("stage_semi_stable - OK")
        return len(models)  # cardinality of union

    def stage_cf2(self, route: List[str] = []) -> int:
        logger.info("stage_cf2")
        logger.debug(f"route: {route}")

        self.stage(route)
        stage = list(map(lambda e: sorted(e.split(" ")), self.models))
        self.cf2(route)
        cf2 = list(map(lambda e: sorted(e.split(" ")), self.models))

        models = []
        for e in stage:
            if e in cf2:
                cf2.remove(e)
                e += ["01", "0", "1"]
            else:
                e += ["0"]
            models.append(e)
        for e in cf2:
            e += ["1"]
            models.append(e)

        self.models = [" ".join(model) for model in models]

        logger.info("stage_cf2 - OK")
        return len(models)  # cardinality of union

    def cf2_semi_stable(self, route: List[str] = []) -> int:
        logger.info("cf2_semi_stable")
        logger.debug(f"route: {route}")

        self.cf2(route)
        cf2 = list(map(lambda e: sorted(e.split(" ")), self.models))
        self.semi_stable(route)
        semi_stable = list(map(lambda e: sorted(e.split(" ")), self.models))

        models = []
        for e in cf2:
            if e in semi_stable:
                semi_stable.remove(e)
                e += ["01", "0", "1"]
            else:
                e += ["0"]
            models.append(e)
        for e in semi_stable:
            e += ["1"]
            models.append(e)

        self.models = [" ".join(model) for model in models]

        logger.info("stage_cf2 - OK")
        return len(models)  # cardinality of union
