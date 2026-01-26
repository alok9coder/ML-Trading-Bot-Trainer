# Machine Learning Training and Testing File for the Trading Bot.
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score
from sklearn.impute import SimpleImputer

# Importing Regression Models below:
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.svm import SVR
from sklearn.neighbors import KNeighborsRegressor

# Importing Classification Models below:
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier

dataset = pd.read_csv("./Data/ONGC_Exit.csv")
X = dataset.iloc[:, 3:-1].values
y = dataset.iloc[:, -1].values

imputer = SimpleImputer(strategy="mean")
X = imputer.fit_transform(X)

print("Dataset ->\n", dataset)
print("X ->\n", X)
print("y ->\n", y)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

regressor = LinearRegression()
regressor.fit(X_train, y_train)
y_pred = regressor.predict(X_test)
linear_regression_score = r2_score(y_test, y_pred)

print("\ny_pred | y_test")
np.set_printoptions(threshold=np.inf) #This forces NumPy to Print the entire array regardless of size
print(np.concatenate(
	(
		y_pred.reshape(len(y_pred), 1),
		y_test.reshape(len(y_test), 1)
	), 1
))

print("Entry Coefficients ->\n", regressor.coef_)
print("Entry Constant ->\n", regressor.intercept_)
print("Linear Regression Score ->\n", linear_regression_score)

input()
