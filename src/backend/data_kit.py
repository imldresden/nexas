from audioop import reverse
from concurrent.futures import process
import logging
from dataclasses import dataclass
from typing import List, Optional, Tuple, Any, Dict
import re

import pandas as pd
import prince


from backend.af_solver import FasbPy

logger = logging.getLogger("data_kit")
logger.setLevel(logging.INFO)
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)
formatter = logging.Formatter("[%(asctime)s %(levelname)s %(name)s] %(message)s")
ch.setFormatter(formatter)
logger.addHandler(ch)


@dataclass
class Data:
    apx_path: str
    route: List[str]
    output_n_models: int = 0
    navigator: Optional[FasbPy] = None
    df: Optional[pd.DataFrame] = None
    correlation_matrix: Optional[pd.DataFrame] = None
    frequencies: Optional[pd.DataFrame] = None
    semantics_identifier: Optional[List[str]] = None
    nbc: int = 0
    n_0: int = 0  # |0|
    n_1: int = 0  # |1|
    n_01: int = 0  # |0+1|
    mapping: Optional[Dict[str, int]] = None
    with_stable: bool = False
    coincide: bool = False

    def read(
        self,
        semantics: List[str],
    ) -> None:
        logger.info("read")
        logger.debug(f"semantic: {semantics}")
        logger.debug(f"route: {self.route}")
        logger.debug(f"output_n_models: {self.output_n_models}")

        if not self.navigator:
            self.navigator = FasbPy(self.apx_path, output_n_models=self.output_n_models)

        route = self.route

        if not len(semantics) == 2:
            logger.error("less or more than two semantics specified")
            return pd.DataFrame([])

        if "stable" in semantics and "preferred" in semantics:
            n = self.navigator.preferred_stable(route)
            self.semantics_identifier = ["preferred", "stable"]
            self.with_stable = True
        elif "stable" in semantics and "stage" in semantics:
            n = self.navigator.stable_stage(route)
            self.semantics_identifier = ["stage", "stable"]
            self.with_stable = True
        elif "stable" in semantics and "semi-stable" in semantics:
            n = self.navigator.stable_semi_stable(route)
            self.semantics_identifier = ["semi-stable", "stable"]
            self.with_stable = True
        elif "stable" in semantics and "cf2" in semantics:
            n = self.navigator.stable_cf2(route)
            self.semantics_identifier = ["cf2", "stable"]
            self.with_stable = True
        elif "preferred" in semantics and "stage" in semantics:
            n = self.navigator.preferred_stage(route)
            self.semantics_identifier = ["preferred", "stage"]
        elif "preferred" in semantics and "semi-stable" in semantics:
            n = self.navigator.preferred_semi_stable(route)
            self.semantics_identifier = ["preferred", "semi-stable"]
        elif "preferred" in semantics and "cf2" in semantics:
            n = self.navigator.preferred_cf2(route)
            self.semantics_identifier = ["preferred", "cf2"]
        elif "stage" in semantics and "semi-stable" in semantics:
            n = self.navigator.stage_semi_stable(route)
            self.semantics_identifier = ["stage", "semi-stable"]
        elif "stage" in semantics and "cf2" in semantics:
            n = self.navigator.stage_cf2(route)
            self.semantics_identifier = ["stage", "cf2"]
        elif "cf2" in semantics and "semi-stable" in semantics:
            n = self.navigator.cf2_semi_stable(route)
            self.semantics_identifier = ["cf2", "semi-stable"]
        else:
            logger.error(f'invalid semantics "{semantics}" specified')
            return pd.DataFrame([])

        if not n:
            logger.info("unsatisfiable - no extensions")
            return pd.DataFrame([])

        df = pd.DataFrame({"model": self.navigator.models})

        logger.info("one hot encoding")
        df = df["model"].str.get_dummies(sep=" ")
        self.n_0 = len(df)  #
        logger.info(f"{self.n_0} extensions")  #

        if self.with_stable:  # trick is used (based on subset-relation)
            n = len(df)
            if "not_stable" in df.columns:  # not all stable
                n_not_stable = int(df["not_stable"].sum())
                self.n_0, self.n_1 = n, n - n_not_stable
                self.n_01 = self.n_1
                df["0"] = [1 for _ in range(n)]
                df["1"] = df["not_stable"].apply(lambda v: 1 if not v else 0)
                df.drop(["not_stable"], axis=1, inplace=True)
                df["01"] = df["1"]
            else:
                # all stable
                # all stable -> 0 = 1 = 01
                logger.info("semantics coincide")
                self.coincide = True
                df["0"] = [1 for _ in range(n)]
                df["1"] = df["0"]
                df["01"] = df["0"]
                self.n_0, self.n_1, self.n_01 = n, n, n
        else:
            if not "0" in df.columns:
                df["0"] = [0 for _ in range(n)]
            if not "1" in df.columns:
                df["1"] = [0 for _ in range(n)]
            if not "01" in df.columns:
                df["01"] = [0 for _ in range(n)]
            # print(df)

        self.df = df

        if self.with_stable:
            self.nbc = len(self.df.columns) - 1
            # self.n_01 = self.n_1
        else:
            self.nbc = len(self.df.columns) - 2
            # TODO:
            self.n_0 = int(self.df["0"].sum())
            self.n_1 = int(self.df["1"].sum())
            self.n_01 = int(self.df["01"].sum())

        self.df.rename(
            columns={col: col.split("(")[-1].split(")")[0] for col in self.df.columns},
            inplace=True,
        )

        self.mapping = {
            col: i for i, col in enumerate(self.df.columns)
        }  # may contain other flag
    
        logger.info("OK")

    def read_from(self, csv_path: str) -> None:
        logger.info(f"{Data.read_from}")
        self.df = pd.read_csv(csv_path)
        logger.info("OK")

    def find_correlations(self) -> None:
        logger.info(f"{Data.find_correlations}")
        self.correlation_matrix = (
            self.df.corr()
            if not self.n_1
            else self.df.drop(["not_stable"], axis=1).corr()
        )
        logger.info("OK")

    def compute_frequencies(self) -> None:
        logger.info(f"{Data.compute_frequencies}")
        df = self.df if not self.n_1 else self.df.drop(["not_stable"], axis=1)
        self.frequencies = pd.DataFrame(
            df.sum(axis=0).map(lambda s: s / len(df)),
            columns=["relative frequency"],
        )

    def reduce_dimension_mca(self) -> None:
        df_with_flags = self.df.copy()
        if not self.n_0:
            df_with_flags.drop(["0"], axis=1, inplace=True)
        if not self.n_1:
            df_with_flags.drop(["1"], axis=1, inplace=True)
        if not self.n_01:
            df_with_flags.drop(["01"], axis=1, inplace=True)
        # print(self.df)
        df = (
            self.df.drop(["0", "1", "01"], axis=1)
            if "01" in self.df.columns
            else self.df
        )
        # print(df)

        mca = prince.MCA(n_components=2)
        mca = mca.fit(df)
        mca = mca.transform(df)
        self.df["mca_position_x"] = mca[0]
        self.df["mca_position_y"] = mca[1]

        mca = prince.MCA(n_components=2)
        mca = mca.fit(df_with_flags)
        mca = mca.transform(df_with_flags)
        self.df["mca_position_x_semantic_flags"] = mca[0]
        self.df["mca_position_y_semantic_flags"] = mca[1]

    def navigate(
        self, route: List[str] = []
    ) -> Tuple[float, float, List[str], pd.DataFrame]:
        logger.info("navigate")

        df = self.df if not self.n_1 else self.df.drop(["not_stable"], axis=1)

        n_as = self.n_0
        n_bc = len(df.columns)

        if route:
            facets = [0 if facet.startswith("~") else 1 for facet in route]
            route = [facet[1:] if facet.startswith("~") else facet for facet in route]
            subspace = df.loc[df[route[0]] == facets[0]]

            for i, atom in enumerate(route[1:]):
                subspace = subspace.loc[subspace[atom] == facets[i + 1]]

            size = len(subspace)
            removed_atoms = [
                col
                for col in subspace.columns
                if not (n := subspace[col].sum()) or n == size
            ]
            subspace.drop(removed_atoms, axis=1, inplace=True)

            facet_count = len(subspace.columns)

            similarity = 1 - facet_count / n_bc
            pace = 1 - len(subspace) / n_as
            inclusive_facets = [
                col for col in subspace.columns if col not in removed_atoms
            ]

            return (similarity, pace, inclusive_facets, subspace)
        else:
            # df = self.df.copy()
            removed_atoms = [
                col for col in df.columns if not (n := df[col].sum()) or n == n_as
            ]
            df.drop(removed_atoms, axis=1, inplace=True)

            similarity = 1 - len(df.columns) / n_bc
            pace = 1 - len(df) / n_as
            inclusive_facets = (
                [col for col in df.columns if col not in removed_atoms],
            )

            return (similarity, pace, inclusive_facets, df)

    def inclusive_facets(self) -> List[str]:
        n_as = len(self.df)
        return [col for col in self.df.columns if (n := self.df[col].sum()) or n < n_as]

    def save(self) -> None:
        logger.info(f"{Data.save}")

        csv_path = f"{self.apx_path}_out={self.output_n_models}_route="
        for facet in self.route:
            csv_path += f"_{facet}"
        csv_path += ".csv"

        self.df.to_csv(csv_path)

        logger.info("OK")

