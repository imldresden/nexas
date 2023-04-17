from backend.data_kit import Data
import json
from typing import List
import logging
import pandas as pd

logger = logging.getLogger("nexas")
logger.setLevel(logging.INFO)
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)
formatter = logging.Formatter("[%(asctime)s %(levelname)s %(name)s] %(message)s")
ch.setFormatter(formatter)
logger.addHandler(ch)

STORAGE = "../output"


def initialize(
    apx_path,
    semantics: List[str] = ["stable", "cf2"],
    route: List[str] = [],
    output_n_models: int = 0,
) -> str:
    logger.info("initialize")

    global DATA

    DATA = Data(apx_path, route=route, output_n_models=output_n_models)
    DATA.read(semantics)

    logger.info("initialize - OK")

    metadata = json.dumps(
        {
            "apx_input": apx_path,
            "route": route,
            "output_n_models": output_n_models,  # 0 means all
            0: DATA.semantics_identifier[0],
            1: DATA.semantics_identifier[1],
            "n_0": DATA.n_0,  # cardinality of 1 - (0+1)
            "n_1": DATA.n_1,  # cardinality of 0 - (0+1)
            "n_01": DATA.n_01,  # cardinality of intersection
            "n_partial_solutions": DATA.nbc,
        }
    )

    return metadata


def arguments() -> str:
    logger.info("arguments")

    global ARGUMENTS_TABLE

    n0, n1, n01 = (
        DATA.n_0 if DATA.n_0 else 1,  # handle /0
        DATA.n_1 if DATA.n_1 else 1,  # handle /0
        DATA.n_01 if DATA.n_01 else 1,  # handle /0
    )
    ARGUMENTS_TABLE = {
        k: {
            "id": v,
            "freqs": [
                float(len(DATA.df.loc[(DATA.df[k] == 1) & (DATA.df["0"] == 1)]) / n0),
                float(len(DATA.df.loc[(DATA.df[k] == 1) & (DATA.df["1"] == 1)]) / n1),
                float(len(DATA.df.loc[(DATA.df[k] == 1) & (DATA.df["01"] == 1)]) / n01),
            ],
            "contained_in": list(DATA.df.loc[DATA.df[k] == 1].index),
        }
        for k, v in DATA.mapping.items()
        if k not in ["0", "1", "01"]
    }

    return json.dumps(ARGUMENTS_TABLE)


def extensions() -> str:
    logger.info("extensions")

    global EXTENSIONS_TABLE

    if len(DATA.df):
        df = DATA.df.copy()
        if "0" in df.columns:
            df.drop(["0"], axis=1, inplace=True)
        if "1" in df.columns:
            df.drop(["1"], axis=1, inplace=True)
        if "01" in df.columns:
            df.drop(["01"], axis=1, inplace=True)

        containss = []
        for i in DATA.df.index:
            bs = df.loc[i] == 1
            containss.append(
                (
                    i,
                    [i for i in bs.index if bs[i]],
                    DATA.df.loc[i]["0"],
                    DATA.df.loc[i]["1"],
                    DATA.df.loc[i]["01"],
                )
            )

        EXTENSIONS_TABLE = {
            int(i): {
                "contains": [v for a in d for k, v in DATA.mapping.items() if a == k],
                "x": DATA.df.loc[i]["mca_position_x"],
                "y": DATA.df.loc[i]["mca_position_y"],
                "0": bool(n),
                "1": bool(m),
                "01": bool(o),
                "x_s": DATA.df.loc[i]["mca_position_x_semantic_flags"],
                "y_s": DATA.df.loc[i]["mca_position_y_semantic_flags"],
            }
            for i, d, n, m, o in containss
        }

    return json.dumps(EXTENSIONS_TABLE)


def corr() -> str:
    logger.info("corr")

    df = DATA.df.drop(
        [
            "0",
            "1",
            "01",
            "mca_position_x",
            "mca_position_y",
            "mca_position_x_semantic_flags",
            "mca_position_y_semantic_flags",
        ],
        axis=1,
    )
    corr_0 = df.loc[DATA.df["0"] == 1].corr().fillna(2.0)  # quickfix
    corr_0_out = corr_0.unstack().to_dict()

    corr_1 = df.loc[DATA.df["1"] == 1].corr().fillna(2.0)  # quickfix
    corr_1_out = corr_1.unstack().to_dict()

    return json.dumps(
        {
            "corrs_0": [
                [k[0], k[1], v] if not v == 2.0 else [k[0], k[1], None]
                for k, v in corr_0_out.items()
            ],
            "corrs_1": [
                [k[0], k[1], v] if not v == 2.0 else [k[0], k[1], None]
                for k, v in corr_1_out.items()
            ],
        }
    )


def main(
    storage: str,
    apx_path: str,
    semantics: List[str],
    route: List[str],
    output_n_models: int,
) -> None:
    with open(storage + "/metadata.json", "w+") as f:
        md = initialize(apx_path, semantics, route, output_n_models)
        f.write(md)

    if isinstance(DATA.df, pd.DataFrame):
        with open(storage + "/arguments.json", "w+") as f:
            f.write(arguments())

        DATA.reduce_dimension_mca()

        with open(storage + "/extensions.json", "w+") as f:
            f.write(extensions())
        with open(storage + "/corrs.json", "w+") as f:
            f.write(corr())
    else: 
        exit(-1)


if __name__ == "__main__":
    import os
    import argparse

    cli =argparse.ArgumentParser()
    cli.add_argument("--apx",  type=str) 
    cli.add_argument("--to",  type=str, default=STORAGE)
    cli.add_argument("--n",  type=int, default=0)
    cli.add_argument("--sem",  nargs="*", type=str)
    cli.add_argument("--route",  nargs="*", type=str, default=[])

    args = cli.parse_args()
    if not os.path.exists(args.to):
        os.makedirs(args.to)

    main(args.to, args.apx, args.sem, args.route, args.n)

